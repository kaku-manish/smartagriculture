import json
import logging
from fastapi import APIRouter, Response
from pydantic import BaseModel
from typing import Optional, List

from database import db_run, db_all, db_get
from services.operator_service import operator_service

router = APIRouter()
logger = logging.getLogger("agro-backend")

class OnboardReq(BaseModel):
    user_id: int
    service_regions: List[str]
    base_rate: Optional[float] = 150.0

class BookingReq(BaseModel):
    farm_id: int
    org_id: int
    operator_id: int
    scheduled_date: str
    acres: float

class StatusUpdateReq(BaseModel):
    status: str

@router.post("/onboard")
def onboard_operator(req: OnboardReq, response: Response):
    sql = """
        INSERT INTO drone_operators (user_id, service_regions, base_rate_per_acre, kyc_status)
        VALUES (?, ?, ?, 'approved')
    """
    try:
        res_info = db_run(sql, [req.user_id, json.dumps(req.service_regions), req.base_rate])
        response.status_code = 201
        return {"operator_id": res_info["lastID"], "message": "Operator onboarded successfully"}
    except Exception as e:
        logger.error(f"Error onboarding operator: {e}")
        response.status_code = 500
        return {"error": "Failed to onboard operator"}

@router.get("/nearby")
def find_nearby(lat: float, lng: float, response: Response, radius: float = 50.0):
    try:
        ops = operator_service.find_nearby_operators(lat, lng, radius)
        return {"count": len(ops), "operators": ops}
    except Exception as e:
        logger.error(f"Error finding operators: {e}")
        response.status_code = 500
        return {"error": "Failed to find nearby operators"}

@router.post("/bookings/create")
def create_booking(req: BookingReq, response: Response):
    sql = """
        INSERT INTO operator_bookings (farm_id, org_id, operator_id, scheduled_date, acres_to_scan, status)
        VALUES (?, ?, ?, ?, ?, 'assigned')
    """
    try:
        res_info = db_run(sql, [req.farm_id, req.org_id, req.operator_id, req.scheduled_date, req.acres])
        return {"booking_id": res_info["lastID"], "message": "Booking confirmed"}
    except Exception as e:
        logger.error(f"Error creating booking: {e}")
        response.status_code = 500
        return {"error": "Failed to create booking"}

@router.patch("/bookings/{booking_id}/status")
def update_status(booking_id: int, req: StatusUpdateReq, response: Response):
    if req.status == 'completed':
        try:
            sql = "UPDATE operator_bookings SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?"
            db_run(sql, [booking_id])
            payout = operator_service.create_payout(booking_id)
            return {"message": "Booking completed and payout generated", "payout": payout}
        except Exception as e:
            logger.error(f"Error updating booking status: {e}")
            response.status_code = 500
            return {"error": f"Booking update failed: {e}"}
    else:
        try:
            sql = "UPDATE operator_bookings SET status = ? WHERE id = ?"
            db_run(sql, [req.status, booking_id])
            return {"message": "Status updated"}
        except Exception as e:
            response.status_code = 500
            return {"error": str(e)}

@router.get("/{operator_id}/payouts")
def get_payouts(operator_id: int, response: Response):
    sql = "SELECT * FROM operator_payouts WHERE operator_id = ? ORDER BY created_at DESC"
    try:
        return db_all(sql, [operator_id])
    except Exception as e:
        response.status_code = 500
        return {"error": str(e)}
