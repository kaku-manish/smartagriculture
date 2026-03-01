import json
import random
import logging
from fastapi import APIRouter, Response

from database import db_get, db_all
from engine.heatmap_engine import heatmap_engine

router = APIRouter()
logger = logging.getLogger("agro-backend")

@router.get("/field/{field_id}")
def generate_field_heatmap(field_id: int, response: Response, cell_size: int = 10):
    try:
        field = db_get("SELECT * FROM farms WHERE farm_id = ?", [field_id])
        if not field:
            response.status_code = 404
            return {"error": "Field not found"}
            
        boundary = None
        try:
            boundary = json.loads(field.get("boundary", "{}")) if field.get("boundary") else None
        except:
            pass
            
        if not boundary:
            loc = field.get("location", "17.385,78.486")
            try:
                lat, lng = map(float, loc.split(','))
            except:
                lat, lng = 17.385, 78.486
                
            offset = 0.001
            boundary = {
                "polygon": [
                    [lat - offset, lng - offset],
                    [lat + offset, lng - offset],
                    [lat + offset, lng + offset],
                    [lat - offset, lng + offset],
                    [lat - offset, lng - offset]
                ]
            }
            
        scan_sql = """
            SELECT sb.timestamp, sd.class_name, sd.confidence, sd.bbox, sd.area_percent,
                   sb.metadata
            FROM scan_batches sb
            JOIN scan_detections sd ON sb.batch_id = sd.batch_id
            JOIN field_zones fz ON sb.zone_id = fz.zone_id
            WHERE fz.farm_id = ?
            ORDER BY sb.timestamp DESC
            LIMIT 1000
        """
        
        scans = db_all(scan_sql, [field_id])
        
        scan_points = []
        processed_batches = set()
        
        for scan in scans:
            gps_lat, gps_lng = None, None
            try:
                meta = json.loads(scan.get("metadata", "{}"))
                gps_lat = meta.get("gps_lat")
                gps_lng = meta.get("gps_lng")
            except:
                pass
                
            if gps_lat is None or gps_lng is None:
                poly = boundary["polygon"]
                gps_lat = poly[0][0] + random.random() * (poly[2][0] - poly[0][0])
                gps_lng = poly[0][1] + random.random() * (poly[2][1] - poly[0][1])
                
            batch_key = scan["timestamp"]
            if batch_key not in processed_batches:
                scan_points.append({
                    "gps_lat": gps_lat,
                    "gps_lng": gps_lng,
                    "timestamp": scan["timestamp"],
                    "detections": []
                })
                processed_batches.add(batch_key)
                
            for sp in scan_points:
                if sp["timestamp"] == batch_key:
                    sp["detections"].append({
                        "class_name": scan.get("class_name"),
                        "confidence": scan.get("confidence"),
                        "bbox_area_percent": scan.get("area_percent")
                    })
                    break
                    
        heatmap = heatmap_engine.generate_heatmap(boundary, scan_points, {"cellSize": cell_size, "tileType": "grid"})
        return heatmap
        
    except Exception as e:
        logger.error(f"Heatmap generation error: {e}")
        response.status_code = 500
        return {"error": "Failed to generate heatmap", "details": str(e)}

@router.get("/zone/{zone_id}")
def generate_zone_heatmap(zone_id: int, response: Response, cell_size: int = 5):
    try:
        zone = db_get("SELECT * FROM field_zones WHERE zone_id = ?", [zone_id])
        if not zone:
            response.status_code = 404
            return {"error": "Zone not found"}
            
        try:
            boundary = json.loads(zone.get("coordinates", "{}"))
        except:
            response.status_code = 400
            return {"error": "Invalid zone coordinates"}
            
        scan_sql = """
            SELECT sb.timestamp, sd.class_name, sd.confidence, sd.area_percent, sb.metadata
            FROM scan_batches sb
            JOIN scan_detections sd ON sb.batch_id = sd.batch_id
            WHERE sb.zone_id = ?
            ORDER BY sb.timestamp DESC
            LIMIT 500
        """
        
        scans = db_all(scan_sql, [zone_id])
        
        scan_points = []
        seen = set()
        
        for scan in scans:
            try:
                meta = json.loads(scan.get("metadata", "{}"))
                gps_lat = meta.get("gps_lat", boundary["polygon"][0][0])
                gps_lng = meta.get("gps_lng", boundary["polygon"][0][1])
            except:
                gps_lat = boundary["polygon"][0][0]
                gps_lng = boundary["polygon"][0][1]
                
            key = scan["timestamp"]
            if key not in seen:
                scan_points.append({
                    "gps_lat": gps_lat,
                    "gps_lng": gps_lng,
                    "timestamp": scan["timestamp"],
                    "detections": [{
                        "class_name": scan.get("class_name"),
                        "confidence": scan.get("confidence"),
                        "bbox_area_percent": scan.get("area_percent")
                    }]
                })
                seen.add(key)
                
        heatmap = heatmap_engine.generate_heatmap(boundary, scan_points, {"cellSize": cell_size})
        return heatmap
        
    except Exception as e:
        logger.error(f"Zone heatmap error: {e}")
        response.status_code = 500
        return {"error": "Failed to generate zone heatmap"}
