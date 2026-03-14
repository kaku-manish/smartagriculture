import os
import jwt
import logging
import datetime
import re
from fastapi import APIRouter, Response
from pydantic import BaseModel
from typing import Optional
from passlib.context import CryptContext

from database import db_run, db_get

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter()
logger = logging.getLogger("agro-backend")

SECRET_KEY = os.getenv("JWT_SECRET", "paddy_secret_key")

class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    field_size: Optional[str] = None
    org_id: Optional[int] = None
    org_name: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    userId: int
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    field_size: Optional[str] = None

@router.post("/register", status_code=201)
def register(req: RegisterRequest, response: Response):
    role = 'farmer'
    
    if not req.username or not req.password:
        response.status_code = 400
        return {"error": "Username and Password are required"}
        
    try:
        hashed_password = pwd_context.hash(req.password)
        target_org_id = req.org_id
        
        if req.org_name:
            slug = re.sub(r'\s+', '-', req.org_name.lower())
            res_org = db_run("INSERT INTO organizations (name, slug, plan_id) VALUES (?, ?, ?)", [req.org_name, slug, 1])
            target_org_id = res_org["lastID"]
            
        try:
            res_user = db_run(
                "INSERT INTO users (username, password_hash, role, full_name, email, phone, gender, org_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [req.username, hashed_password, role, req.full_name, req.email, req.phone, req.gender, target_org_id]
            )
        except Exception as err:
            err_msg = str(err)
            if 'UNIQUE constraint failed' in err_msg or 'duplicate key value' in err_msg:
                response.status_code = 400
                return {"error": "Username already exists"}
            response.status_code = 500
            return {"error": "Database error"}
            
        user_id = res_user["lastID"]
        
        try:
            size_val = float(req.field_size) if req.field_size else 0.0
        except Exception:
            size_val = 0.0
            
        try:
            db_run(
                "INSERT INTO farms (user_id, farmer_name, location, soil_type, field_size, current_crop, org_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [user_id, req.full_name, '', 'fertile', size_val, 'Paddy', target_org_id]
            )
        except Exception as e:
            logger.error("Error creating default farm: %s", str(e))
            
        return {
            "message": "User registered successfully",
            "userId": user_id,
            "orgId": target_org_id
        }
        
    except Exception as e:
        logger.error("Server error: %s", str(e))
        response.status_code = 500
        return {"error": "Server error"}

@router.post("/login")
def login(req: LoginRequest, response: Response):
    try:
        user = db_get("SELECT * FROM users WHERE username = ?", [req.username])
        if not user:
            response.status_code = 400
            return {"error": "Invalid credentials"}
            
        if req.role and user.get("role") != req.role:
            response.status_code = 401
            return {"error": f"User is not an {req.role}"}
            
        is_match = pwd_context.verify(req.password, user.get("password_hash", ""))
        if not is_match:
            response.status_code = 400
            return {"error": "Invalid credentials"}
            
        payload = {
            "id": user.get("id"),
            "username": user.get("username"),
            "role": user.get("role"),
            "org_id": user.get("org_id"),
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        
        return {
            "message": "Login successful",
            "token": token,
            "user": {
                "id": user.get("id"),
                "username": user.get("username"),
                "full_name": user.get("full_name"),
                "role": user.get("role"),
                "org_id": user.get("org_id")
            }
        }
    except Exception as e:
        logger.error("Login database error: %s", str(e))
        response.status_code = 500
        return {"error": "Database error"}

@router.put("/update-profile")
def update_profile(req: UpdateProfileRequest, response: Response):
    logger.info("Received update-profile request: %s", req.dict())
    
    if not req.userId:
        logger.error("Update failed: Missing userId")
        response.status_code = 400
        return {"error": "User ID is required"}
        
    try:
        try:
            safe_size = float(req.field_size) if req.field_size not in (None, "") else 0.0
        except ValueError:
            safe_size = 0.0
            
        safe_location = req.location or ''
        safe_phone = req.phone or ''
        safe_name = req.full_name or ''
        
        try:
            db_run("UPDATE users SET full_name = ?, phone = ? WHERE id = ?", [safe_name, safe_phone, req.userId])
        except Exception as e:
            logger.error("Error updating user table: %s", str(e))
            response.status_code = 500
            return {"error": "Failed to update user details"}
            
        try:
            res_farm = db_run(
                "UPDATE farms SET farmer_name = ?, location = ?, field_size = ? WHERE user_id = ?",
                [safe_name, safe_location, safe_size, req.userId]
            )
            logger.info("Profile updated for user %s. Changes: %s", req.userId, res_farm["changes"])
            return {"message": "Profile updated successfully"}
            
        except Exception as e:
            logger.error("Error updating farms table: %s", str(e))
            response.status_code = 500
            return {"error": "Failed to update farm details"}
            
    except Exception as e:
        logger.error("Update profile server error: %s", str(e))
        response.status_code = 500
        return {"error": "Server error"}
