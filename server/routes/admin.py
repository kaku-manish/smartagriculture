import logging
from fastapi import APIRouter, Response, Depends
from pydantic import BaseModel
from typing import Optional

from database import db_all, db_get, db_run
from middleware.auth import AuthRole

router = APIRouter()
logger = logging.getLogger("agro-backend")

auth_admin = AuthRole(required_role="admin")

# ── GET all farmers ────────────────────────────────────────────────────────────
@router.get("/farmers")
def get_farmers(response: Response, user: dict = Depends(auth_admin)):
    sql = """
        SELECT 
            u.id as user_id, 
            u.full_name, 
            u.username, 
            u.email, 
            u.phone,
            u.created_at,
            f.farm_id,
            f.location,
            f.soil_type,
            f.field_size,
            f.current_crop
        FROM users u
        LEFT JOIN farms f ON u.id = f.user_id
        WHERE u.role = 'farmer'
        ORDER BY u.created_at DESC
    """
    try:
        rows = db_all(sql)
        return rows
    except Exception as e:
        logger.error(f"Error fetching farmers: {e}")
        response.status_code = 500
        return {"error": "Failed to fetch farmers list"}


# ── Request model for editing a farmer ────────────────────────────────────────
class EditFarmerReq(BaseModel):
    full_name:    Optional[str]   = None
    email:        Optional[str]   = None
    phone:        Optional[str]   = None
    field_size:   Optional[float] = None
    location:     Optional[str]   = None
    current_crop: Optional[str]   = None


# ── PUT /admin/farmers/{user_id} — edit farmer details ────────────────────────
@router.put("/farmers/{user_id}")
def edit_farmer(user_id: int, req: EditFarmerReq, response: Response,
                user: dict = Depends(auth_admin)):
    try:
        # Update users table
        user_fields, user_vals = [], []
        if req.full_name is not None:
            user_fields.append("full_name = ?"); user_vals.append(req.full_name)
        if req.email is not None:
            user_fields.append("email = ?"); user_vals.append(req.email)
        if req.phone is not None:
            user_fields.append("phone = ?"); user_vals.append(req.phone)

        if user_fields:
            db_run(f"UPDATE users SET {', '.join(user_fields)} WHERE id = ?",
                   user_vals + [user_id])

        # Update farms table
        farm_fields, farm_vals = [], []
        if req.field_size is not None:
            farm_fields.append("field_size = ?"); farm_vals.append(req.field_size)
        if req.location is not None:
            farm_fields.append("location = ?"); farm_vals.append(req.location)
        if req.current_crop is not None:
            farm_fields.append("current_crop = ?"); farm_vals.append(req.current_crop)

        if farm_fields:
            db_run(f"UPDATE farms SET {', '.join(farm_fields)} WHERE user_id = ?",
                   farm_vals + [user_id])

        logger.info(f"Admin updated farmer user_id={user_id}")
        return {"message": "Farmer updated successfully"}
    except Exception as e:
        logger.error(f"Error editing farmer {user_id}: {e}")
        response.status_code = 500
        return {"error": str(e)}


# ── DELETE /admin/farmers/{user_id} — remove farmer account ───────────────────
@router.delete("/farmers/{user_id}")
def delete_farmer(user_id: int, response: Response,
                  user: dict = Depends(auth_admin)):
    try:
        # Remove related farm data first to avoid FK constraint errors
        farmer = db_get("SELECT farm_id FROM farms WHERE user_id = ?", [user_id])
        if farmer and farmer.get("farm_id"):
            fid = farmer["farm_id"]
            for tbl, col in [
                ("drone_analysis",          "farm_id"),
                ("disease_risk_assessments","zone_id"),
                ("field_zones",             "farm_id"),
                ("iot_sensors",             "farm_id"),
                ("reports",                 "farm_id"),
            ]:
                try:
                    db_run(f"DELETE FROM {tbl} WHERE {col} = ?", [fid])
                except Exception:
                    pass  # table may not exist — skip silently
            db_run("DELETE FROM farms WHERE farm_id = ?", [fid])

        db_run("DELETE FROM users WHERE id = ?", [user_id])
        logger.info(f"Admin deleted farmer user_id={user_id}")
        return {"message": "Farmer deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting farmer {user_id}: {e}")
        response.status_code = 500
        return {"error": str(e)}


# ── GET drone analysis log ─────────────────────────────────────────────────────
@router.get("/drone-analysis")
def get_drone_analysis(response: Response, user: dict = Depends(auth_admin)):
    sql = """
        SELECT 
            da.*, 
            f.farmer_name,
            f.location
        FROM drone_analysis da
        JOIN farms f ON da.farm_id = f.farm_id
        ORDER BY da.analysis_date DESC
    """
    try:
        rows = db_all(sql)
        return rows
    except Exception as e:
        logger.error(f"Error fetching drone analysis: {e}")
        response.status_code = 500
        return {"error": "Failed to fetch drone analysis records"}
