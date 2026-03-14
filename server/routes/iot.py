import logging
from fastapi import APIRouter, Response
from pydantic import BaseModel
from typing import Optional

from database import db_run

router = APIRouter()
logger = logging.getLogger("agro-backend")

class IoTReadingReq(BaseModel):
    farm_id: int
    soil_moisture: Optional[float] = None
    water_level: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None

@router.post("/reading")
def add_iot_reading(req: IoTReadingReq, response: Response):
    if not req.farm_id:
        response.status_code = 400
        return {"error": "farm_id is required"}
        
    sql = """
        INSERT INTO iot_readings (farm_id, soil_moisture, water_level, temperature, humidity) 
        VALUES (?, ?, ?, ?, ?)
    """
    
    try:
        res_ins = db_run(sql, [req.farm_id, req.soil_moisture, req.water_level, req.temperature, req.humidity])
        return {
            "message": "Reading added successfully",
            "reading_id": res_ins["lastID"]
        }
    except Exception as e:
        logger.error(f"Error inserting IOT data: {e}")
        response.status_code = 500
        return {"error": "Failed to insert data"}
