import json
import logging
import datetime
from fastapi import APIRouter, Response

from database import db_all, db_get
from engine.geospatial_engine import geo_spatial_engine

router = APIRouter()
logger = logging.getLogger("agro-backend")

def get_field_boundary(field_id: int):
    sql = "SELECT * FROM farms WHERE farm_id = ?"
    row = db_get(sql, [field_id])
    if not row or not row.get("boundary"):
        return {
            "polygon": [
                [17.385, 78.486], [17.387, 78.486],
                [17.387, 78.489], [17.385, 78.489], [17.385, 78.486]
            ]
        }
    try:
        return json.loads(row["boundary"])
    except:
        return {
            "polygon": [
                [17.385, 78.486], [17.387, 78.486],
                [17.387, 78.489], [17.385, 78.489], [17.385, 78.486]
            ]
        }

def get_projected_scans(field_id: int, days: int = 30):
    date_cutoff = (datetime.datetime.now() - datetime.timedelta(days=days)).strftime("%Y-%m-%d")
    sql = """
        SELECT sb.timestamp, sd.class_name, sd.confidence, sd.bbox, sd.area_percent, sb.metadata
        FROM scan_batches sb
        JOIN scan_detections sd ON sb.batch_id = sd.batch_id
        JOIN field_zones fz ON sb.zone_id = fz.zone_id
        WHERE fz.farm_id = ? 
          AND sb.timestamp >= ?
        ORDER BY sb.timestamp ASC
    """
    rows = db_all(sql, [field_id, date_cutoff])
    points = []
    for r in rows:
        lat, lng = 17.386, 78.487
        try:
            meta = json.loads(r.get("metadata", "{}"))
            lat = meta.get("gps_lat", lat)
            lng = meta.get("gps_lng", lng)
        except:
            pass
        points.append({
            "gps_lat": lat,
            "gps_lng": lng,
            "timestamp": r.get("timestamp"),
            "detections": [{
                "class_name": r.get("class_name"),
                "confidence": r.get("confidence"),
                "bbox_area_percent": r.get("area_percent")
            }]
        })
    return points

@router.get("/field/{field_id}/heatmap")
def heatmap(field_id: int, response: Response):
    try:
        boundary = get_field_boundary(field_id)
        scans = get_projected_scans(field_id, 90)
        result = geo_spatial_engine.generate_heatmap(boundary, scans, {"cellSize": 10})
        return result
    except Exception as e:
        logger.error(f"Error geo heatmap: {e}")
        response.status_code = 500
        return {"error": str(e)}

@router.get("/field/{field_id}/spread")
def spread(field_id: int, response: Response, disease: str = None):
    try:
        scans = get_projected_scans(field_id, 14)
        spread_ctx = geo_spatial_engine.calculate_spread(scans, disease)
        return {
            "success": True,
            "analysis": spread_ctx or "Not enough data points to calculate spread"
        }
    except Exception as e:
        logger.error(f"Error geo spread: {e}")
        response.status_code = 500
        return {"error": str(e)}

@router.get("/field/{field_id}/zones")
def zones(field_id: int, response: Response):
    try:
        boundary = get_field_boundary(field_id)
        scans = get_projected_scans(field_id, 90)
        result = geo_spatial_engine.generate_heatmap(boundary, scans, {"cellSize": 10})
        return result["zones"]
    except Exception as e:
        logger.error(f"Error geo zones: {e}")
        response.status_code = 500
        return {"error": str(e)}

@router.get("/field/{field_id}/summary")
def summary(field_id: int, response: Response):
    try:
        boundary = get_field_boundary(field_id)
        scans = get_projected_scans(field_id, 90)
        
        tiles = geo_spatial_engine.create_tiles(boundary, 10)
        tiles_with_data = geo_spatial_engine.assign_scans_to_tiles(tiles, scans)
        scored_tiles = geo_spatial_engine.compute_tile_scores(tiles_with_data)
        
        stats = geo_spatial_engine.generate_stats(scored_tiles)
        return stats
    except Exception as e:
        logger.error(f"Error geo summary: {e}")
        response.status_code = 500
        return {"error": str(e)}

@router.get("/field/{field_id}/progression")
def progression(field_id: int, response: Response, days: int = 7, disease: str = None):
    try:
        boundary = get_field_boundary(field_id)
        scans = get_projected_scans(field_id, days * 2 + 1)
        result = geo_spatial_engine.analyze_progression(boundary, scans, {
            "days": days,
            "disease": disease
        })
        return result
    except Exception as e:
        logger.error(f"Error geo progression: {e}")
        response.status_code = 500
        return {"error": str(e)}
