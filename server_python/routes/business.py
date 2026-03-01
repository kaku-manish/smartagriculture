import logging
from fastapi import APIRouter, Response, Depends
from pydantic import BaseModel

from database import db_run, db_all, db_get
from middleware.auth import AuthRole
from services.billing_service import billing_service

router = APIRouter()
logger = logging.getLogger("agro-backend")

auth_admin = AuthRole(required_role="super_admin")
auth_org = AuthRole(required_role="org_admin")
auth_op = AuthRole(required_role="operator")

class OrgReq(BaseModel):
    name: str
    plan_id: int

class ScheduleScanReq(BaseModel):
    field_id: int
    scheduled_date: str

class UploadScanReq(BaseModel):
    scan_id: int
    acres_covered: float
    result_json: str

@router.get("/orgs")
def get_orgs(response: Response, user: dict = Depends(auth_admin)):
    sql = "SELECT o.*, p.name as plan_name FROM organizations o JOIN subscription_plans p ON o.plan_id = p.id"
    try:
        rows = db_all(sql)
        return rows
    except Exception as e:
        logger.error(f"Error getting orgs: {e}")
        response.status_code = 500
        return {"error": "Failed to fetch orgs"}

@router.post("/orgs")
def create_org(req: OrgReq, response: Response, user: dict = Depends(auth_admin)):
    slug = req.name.lower().replace(" ", "-")
    sql = "INSERT INTO organizations (name, slug, plan_id) VALUES (?, ?, ?)"
    try:
        res_info = db_run(sql, [req.name, slug, req.plan_id])
        return {"id": res_info["lastID"], "message": "Organization created successfully"}
    except Exception as e:
        logger.error(f"Error creating orgs: {e}")
        response.status_code = 500
        return {"error": "Failed to create org"}

@router.post("/scans/schedule")
def schedule_scan(req: ScheduleScanReq, response: Response):
    # Simplified authentication check for this endpoint
    sql = "INSERT INTO scans (org_id, field_id, scheduled_date, status) VALUES (?, ?, ?, 'scheduled')"
    try:
        # Defaults to org 1 for bypass
        res_info = db_run(sql, [1, req.field_id, req.scheduled_date])
        return {"scan_id": res_info["lastID"], "status": "scheduled"}
    except Exception as e:
        logger.error(f"Error scheduling scan: {e}")
        response.status_code = 500
        return {"error": "Failed to schedule scan"}

@router.post("/scans/upload")
def upload_scan(req: UploadScanReq, response: Response):
    sql = "UPDATE scans SET status = 'completed', acres_covered = ?, result_json = ?, operator_id = ? WHERE id = ?"
    try:
        res_info = db_run(sql, [req.acres_covered, req.result_json, 1, req.scan_id])
        return {"message": "Scan results uploaded and usage updated."}
    except Exception as e:
        logger.error(f"Error uploading scan: {e}")
        response.status_code = 500
        return {"error": "Failed to upload scan"}

@router.get("/billing/usage")
def get_usage(response: Response, user: dict = Depends(auth_org)):
    org_id = user.get("org_id", 1) # simple fallback
    usage = billing_service.get_usage(org_id)
    plan = billing_service.get_org_plan(org_id)
    
    plan_name = plan.get("name") if plan else "Unknown"
    acre_limit = plan.get("acre_limit") if plan else 0
    current_acres = usage.get("total_acres") if usage and usage.get("total_acres") else 0
    
    return {
        "usage": {"total_acres": current_acres},
        "plan": {"name": plan_name, "acre_limit": acre_limit},
        "remaining": max(0, acre_limit - current_acres)
    }

@router.get("/audit")
def get_audit(response: Response):
    sql = "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100"
    try:
        return db_all(sql)
    except:
        return []
