import logging
from fastapi import APIRouter, Response

from database import db_get, db_all
from engine.recommender import generate_recommendation

router = APIRouter()
logger = logging.getLogger("agro-backend")

@router.get("/{farm_id}/status")
def get_farm_status(farm_id: int, response: Response):
    try:
        farm = db_get("SELECT * FROM farms WHERE farm_id = ?", [farm_id])
        if not farm:
            response.status_code = 404
            return {"error": "Farm not found"}
            
        iot = db_get("SELECT * FROM iot_readings WHERE farm_id = ? ORDER BY timestamp DESC LIMIT 1", [farm_id])
        drone = db_get("SELECT * FROM drone_analysis WHERE farm_id = ? ORDER BY analysis_date DESC LIMIT 1", [farm_id])
        kb_crops = db_all("SELECT * FROM kb_crops")
        kb_diseases = db_all("SELECT * FROM kb_diseases")
        
        rec = generate_recommendation(farm, iot, drone, kb_crops, kb_diseases)
        
        return {
            "farm": farm,
            "latest_iot": iot or None,
            "latest_drone": drone or None,
            "recommendation": rec
        }
    except Exception as e:
        logger.error(f"Error getting farm status: {e}")
        response.status_code = 500
        return {"error": "Internal server error"}

@router.get("/user/{user_id}/status")
def get_user_status(user_id: int, response: Response):
    try:
        farm = db_get("SELECT * FROM farms WHERE user_id = ?", [user_id])
        if not farm:
            response.status_code = 404
            return {"error": "Farm not found for this user"}
            
        farm_id = farm.get("farm_id")
        
        iot = db_get("SELECT * FROM iot_readings WHERE farm_id = ? ORDER BY timestamp DESC LIMIT 1", [farm_id])
        drone = db_get("SELECT * FROM drone_analysis WHERE farm_id = ? ORDER BY analysis_date DESC LIMIT 1", [farm_id])
        kb_crops = db_all("SELECT * FROM kb_crops")
        kb_diseases = db_all("SELECT * FROM kb_diseases")
        
        rec = generate_recommendation(farm, iot, drone, kb_crops, kb_diseases)
        
        return {
            "farm": farm,
            "latest_iot": iot or None,
            "latest_drone": drone or None,
            "recommendation": rec
        }
    except Exception as e:
        logger.error(f"Error getting user farm status: {e}")
        response.status_code = 500
        return {"error": "Internal server error"}
