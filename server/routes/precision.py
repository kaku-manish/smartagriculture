import json
import logging
import datetime
from fastapi import APIRouter, Response
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from database import db_get, db_run, db_all
from engine.precision_engine import precision_engine

router = APIRouter()
logger = logging.getLogger("agro-backend")

class Detection(BaseModel):
    class_name: str
    confidence: float
    bbox: Optional[List[float]] = None
    area_percent: Optional[float] = None
    area_px: Optional[float] = None

class ScanResultsReq(BaseModel):
    zone_id: int
    detections: List[Detection]
    timestamp: Optional[str] = None
    drone_id: Optional[str] = None
    image_area_px: Optional[float] = None

@router.post("/scan-results")
async def process_scan_results(req: ScanResultsReq, response: Response):
    zone_id = req.zone_id
    detections = req.detections
    
    if not zone_id or not detections:
        response.status_code = 400
        return {"error": "Missing required fields: zone_id, detections"}
        
    try:
        timestamp_str = req.timestamp or datetime.datetime.now().isoformat()
        meta = json.dumps({"drone_id": req.drone_id, "image_area_px": req.image_area_px})
        
        batch_sql = "INSERT INTO scan_batches (zone_id, timestamp, metadata) VALUES (?, ?, ?)"
        res_batch = db_run(batch_sql, [zone_id, timestamp_str, meta])
        batch_id = res_batch["lastID"]
        
        detection_sql = """
            INSERT INTO scan_detections (batch_id, class_name, confidence, bbox, area_percent)
            VALUES (?, ?, ?, ?, ?)
        """
        for d in detections:
            db_run(detection_sql, [
                batch_id,
                d.class_name,
                d.confidence,
                json.dumps(d.bbox or []),
                d.area_percent or 0
            ])
            
        weather_data = {"temp_c": 28, "humidity": 75, "rain_prob": 20, "wind_speed": 10}
        soil_data = {"moisture": 55, "water_level": 5}
        
        try:
            iot_sql = """
                SELECT soil_moisture, x.water_level, temperature, humidity 
                FROM iot_readings x
                WHERE farm_id = (SELECT farm_id FROM field_zones WHERE zone_id = ?) 
                ORDER BY timestamp DESC LIMIT 1
            """
            iot_row = db_get(iot_sql, [zone_id])
            if iot_row:
                soil_data["moisture"] = iot_row.get("soil_moisture", 55)
                soil_data["water_level"] = iot_row.get("water_level") or 5
                if iot_row.get("temperature"): weather_data["temp_c"] = iot_row["temperature"]
                if iot_row.get("humidity"): weather_data["humidity"] = iot_row["humidity"]
        except Exception as e:
            logger.warning(f"IoT Fetch Error: {e}")
            
        try:
            w_sql = "SELECT temp_c, humidity, rain_prob, wind_kph FROM weather_logs WHERE zone_id = ? ORDER BY recorded_at DESC LIMIT 1"
            w_row = db_get(w_sql, [zone_id])
            if w_row:
                weather_data["rain_prob"] = w_row.get("rain_prob")
                weather_data["wind_speed"] = w_row.get("wind_kph")
        except Exception:
            pass
            
        crop_stage = 'tillering'
        try:
            cz_row = db_get("SELECT crop_stage FROM field_zones WHERE zone_id = ?", [zone_id])
            if cz_row and cz_row.get("crop_stage"):
                crop_stage = cz_row["crop_stage"]
        except Exception:
            pass
            
        history_data = {"last_7_days_count": 0, "prev_7_days_count": 0}
        try:
            now = datetime.datetime.now()
            d7 = (now - datetime.timedelta(days=7)).isoformat()
            d14 = (now - datetime.timedelta(days=14)).isoformat()
            
            h_sql = """
                SELECT 
                    SUM(CASE WHEN sb.timestamp >= ? THEN 1 ELSE 0 END) as recent,
                    SUM(CASE WHEN sb.timestamp < ? AND sb.timestamp >= ? THEN 1 ELSE 0 END) as previous
                FROM scan_detections sd
                JOIN scan_batches sb ON sd.batch_id = sb.batch_id
                WHERE sb.zone_id = ?
            """
            h_row = db_get(h_sql, [d7, d7, d14, zone_id])
            if h_row:
                history_data["last_7_days_count"] = h_row.get("recent") or 0
                history_data["prev_7_days_count"] = h_row.get("previous") or 0
        except Exception:
            pass
            
        det_list = [d.dict() for d in detections]
        scan_data_dict = {"detections": det_list, "image_area_px": req.image_area_px}
        
        result = await precision_engine.analyze(
            scan_data_dict,
            weather_data,
            soil_data,
            history_data,
            crop_stage
        )
        
        risk_sql = """
            INSERT INTO disease_risk_assessments 
            (zone_id, timestamp, overall_risk_score, disease_pressure_score, weather_risk_score, soil_stress_score, recommendation_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        
        rec_json = json.dumps(result)
        db_run(risk_sql, [
            zone_id,
            datetime.datetime.now().isoformat(),
            result["risk_score"],
            result["breakdown"]["dss"],
            result["breakdown"]["wri"],
            result["breakdown"]["ssi"],
            rec_json
        ])
        
        return result
        
    except Exception as e:
        logger.error(f"Scan Error: {e}")
        response.status_code = 500
        return {"error": "Processing failed"}

@router.get("/field/{zone_id}/risk-summary")
def risk_summary(zone_id: int, response: Response):
    sql = "SELECT * FROM disease_risk_assessments WHERE zone_id = ? ORDER BY timestamp DESC LIMIT 1"
    row = db_get(sql, [zone_id])
    if not row:
        response.status_code = 404
        return {"message": "No data for this zone"}
        
    try:
        if row.get("recommendation_json"):
            row["recommendation_json"] = json.loads(row["recommendation_json"])
    except:
        pass
    return row

@router.get("/zone/{zone_id}/recommendations")
def recommendations(zone_id: int, response: Response):
    sql = "SELECT recommendation_json FROM disease_risk_assessments WHERE zone_id = ? ORDER BY timestamp DESC LIMIT 1"
    row = db_get(sql, [zone_id])
    if not row:
        response.status_code = 404
        return {"message": "No recommendations found"}
        
    try:
        return json.loads(row["recommendation_json"])
    except:
        response.status_code = 500
        return {"error": "Data Parse Error"}

@router.get("/field/{farm_id}/heatmap")
def heatmap(farm_id: int, response: Response):
    sql = """
        SELECT z.zone_id, z.name, z.coordinates, ra.overall_risk_score, ra.timestamp
        FROM field_zones z
        LEFT JOIN disease_risk_assessments ra ON z.zone_id = ra.zone_id
        WHERE z.farm_id = ?
        AND (ra.assessment_id IS NULL OR ra.assessment_id IN (
            SELECT MAX(assessment_id) FROM disease_risk_assessments GROUP BY zone_id
        ))
    """
    try:
        rows = db_all(sql, [farm_id])
        return rows
    except Exception as e:
        response.status_code = 500
        return {"error": f"DB Error: {str(e)}"}
