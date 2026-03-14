import json
import logging
from fastapi import APIRouter, Response

from database import db_run, db_all, db_get
from engine.prediction_engine import prediction_engine
from engine.forecast_engine import forecast_engine

router = APIRouter()
logger = logging.getLogger("agro-backend")

@router.get("/zone/{zone_id}/severity-forecast")
def get_severity_forecast(zone_id: int, response: Response, days: int = 7):
    sql = """
        SELECT overall_risk_score as val, timestamp 
        FROM disease_risk_assessments 
        WHERE zone_id = ? 
        ORDER BY timestamp ASC 
        LIMIT 30
    """
    try:
        rows = db_all(sql, [zone_id])
        data_points = [r.get("val", 0) for r in rows if "val" in r]
        result = forecast_engine.forecast(data_points, days)
        return result
    except Exception as e:
        logger.error(f"Error forecasting severity: {e}")
        response.status_code = 500
        return {"error": "Failed to forecast severity"}

@router.post("/sync/{zone_id}")
async def sync_prediction(zone_id: int, response: Response):
    history_sql = "SELECT timestamp, overall_risk_score as severity_score FROM disease_risk_assessments WHERE zone_id = ? ORDER BY timestamp DESC LIMIT 10"
    weather_sql = "SELECT humidity, temp_c as temp_avg, rain_prob FROM weather_logs WHERE zone_id = ? ORDER BY recorded_at DESC LIMIT 24"
    zone_sql = "SELECT farm_id, crop_stage FROM field_zones WHERE zone_id = ?"
    
    try:
        history = db_all(history_sql, [zone_id])
        weather_rows = db_all(weather_sql, [zone_id])
        zone = db_get(zone_sql, [zone_id])
        
        if not zone:
            response.status_code = 404
            return {"error": "Zone not found"}
            
        len_w = len(weather_rows)
        avg_weather = {
            "humidity_avg": sum(r.get("humidity", 0) for r in weather_rows) / len_w if len_w else 70,
            "temp_avg": sum(r.get("temp_avg", 0) for r in weather_rows) / len_w if len_w else 28,
            "rain_prob": weather_rows[0].get("rain_prob", 0) if len_w else 0
        }
        
        prediction = await prediction_engine.predict(history, {"moisture_current": 35}, avg_weather, zone.get("crop_stage", "tillering"))
        
        save_sql = "INSERT INTO disease_predictions (farm_id, zone_id, disease_class, prob_7d, prob_14d, confidence, reasons) VALUES (?, ?, ?, ?, ?, ?, ?)"
        db_run(save_sql, [zone.get("farm_id"), zone_id, 'blast', prediction["prob_7d"], prediction["prob_14d"], prediction["confidence"], json.dumps(prediction["reasons"])])
        
        if prediction["prob_7d"] > 50:
            alert_sql = "INSERT INTO early_alerts (farm_id, zone_id, level, message, reasons) VALUES (?, ?, ?, ?, ?)"
            msg = f"High outbreak probability ({prediction['prob_7d']}%) predicted for Zone {zone_id} within 7 days."
            db_run(alert_sql, [zone.get("farm_id"), zone_id, prediction["level"], msg, json.dumps(prediction["reasons"])])
            
        return {"success": True, "prediction": prediction}
        
    except Exception as e:
        logger.error(f"Error predicting sync: {e}")
        response.status_code = 500
        return {"error": "Prediction sync failed"}

@router.get("/field/{farm_id}/alerts")
def get_alerts(farm_id: int, response: Response):
    sql = "SELECT * FROM early_alerts WHERE farm_id = ? ORDER BY timestamp DESC LIMIT 20"
    try:
        rows = db_all(sql, [farm_id])
        return rows
    except Exception as e:
        logger.error(f"Error fetching alerts: {e}")
        response.status_code = 500
        return {"error": "Failed to fetch alerts"}

@router.get("/zone/{zone_id}/predictions")
def get_zone_predictions(zone_id: int, response: Response):
    sql = "SELECT * FROM disease_predictions WHERE zone_id = ? ORDER BY timestamp DESC LIMIT 1"
    try:
        row = db_get(sql, [zone_id])
        if row and row.get("reasons"):
            try:
                row["reasons"] = json.loads(row["reasons"])
            except:
                row["reasons"] = []
        return row
    except Exception as e:
        logger.error(f"Error fetching predictions: {e}")
        response.status_code = 500
        return {"error": "Failed to fetch predictions"}
