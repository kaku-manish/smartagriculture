import os
import json
import logging
from pathlib import Path
from fastapi import APIRouter, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Literal

from database import db_get, db_all, db_run
from engine.summary_engine import summary_engine
# We will create report_engine shortly
from engine.report_engine import report_engine

router = APIRouter()
logger = logging.getLogger("agro-backend")

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
REPORTS_DIR = UPLOADS_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Allowed source types — validated by Pydantic, defaults to 'manual'
SOURCE_TYPE = Literal["manual", "live", "drone"]

class GenerateReportReq(BaseModel):
    farm_id: int
    language: str = 'en'
    source_type: SOURCE_TYPE = 'manual'   # <-- NEW: controls PDF label

@router.get("/field/{farm_id}/message-summary")
def get_message_summary(farm_id: int, response: Response):
    sql = """
        SELECT r.*, f.farmer_name, (SELECT COUNT(*) FROM field_zones WHERE farm_id = f.farm_id) as zones_count
        FROM farms f
        LEFT JOIN disease_risk_assessments r ON r.zone_id = f.farm_id
        WHERE f.farm_id = ? 
        ORDER BY r.timestamp DESC LIMIT 1
    """
    data = db_get(sql, [farm_id])
    if not data or not data.get("overall_risk_score"):
        response.status_code = 404
        return {"error": "No risk data found to generate summary."}
        
    rec_str = data.get("recommendation_json", "{}")
    rec = {}
    if rec_str:
        try:
            rec = json.loads(rec_str)
        except:
            pass
            
    risk_score = int(round(data.get("overall_risk_score", 0)))
    risk_level = 'CRITICAL' if risk_score > 75 else ('HIGH' if risk_score > 50 else 'MEDIUM')
    zones_count = data.get("zones_count") or 1
    
    treatment = rec.get("treatment", {}).get("product_name", "Tricyclazole 75% WP") if isinstance(rec, dict) else "Tricyclazole 75% WP"
    dosage = rec.get("treatment", {}).get("dosage_per_acre", "120g in 200L water") if isinstance(rec, dict) else "120g in 200L water"
    spray_window = rec.get("best_spray_window", [{"time": "06:00 AM - 09:00 AM"}])[0].get("time", "06:00 AM - 09:00 AM") if isinstance(rec, dict) and rec.get("best_spray_window") else "06:00 AM - 09:00 AM"

    input_data = {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "disease": "Blast",
        "zones_count": zones_count,
        "treatment": treatment,
        "dosage": dosage,
        "spray_window": spray_window,
        "reasons": [
            "Humidity levels are critically high",
            "Spore count in neighboring zones is rising",
            "Crop stage is highly vulnerable"
        ],
        "reasons_te": [
            "గాలిలో తేమ శాతం అధికంగా ఉంది",
            "పొరుగు పొలాల్లో తెగులు వ్యాప్తి చెందుతోంది",
            "వరి పంట ప్రస్తుత దశలో తెగులు సులభంగా ఆశించే అవకాశం ఉంది"
        ]
    }
    
    return summary_engine.generate(input_data)

@router.get("/{farm_id}")
def fetch_reports(farm_id: int, response: Response):
    try:
        rows = db_all("SELECT * FROM reports WHERE farm_id = ? ORDER BY generated_date DESC", [farm_id])
        return {"reports": rows}
    except Exception as e:
        logger.error(f"Failed to fetch reports: {e}")
        response.status_code = 500
        return {"error": "Failed to fetch reports"}

@router.post("/generate")
async def generate_report(req: GenerateReportReq, response: Response):
    farm_id = req.farm_id
    language = req.language
    logger.info(f"[REPORTS] Generating report for farm_id: {farm_id} (language: {language})")
    
    try:
        # Fetch farm info first
        farm = db_get("SELECT * FROM farms WHERE farm_id = ?", [farm_id])
        if not farm:
            logger.info(f"❌ Report Generation Failed: Farm #{farm_id} not found")
            response.status_code = 404
            return {"error": "No risk data found for this farm."}

        # Fetch latest risk assessment
        r = db_get("SELECT * FROM disease_risk_assessments WHERE zone_id = ? ORDER BY timestamp DESC LIMIT 1", [farm_id])
        
        # Fetch latest drone analysis
        da = db_get("SELECT * FROM drone_analysis WHERE farm_id = ? ORDER BY analysis_date DESC LIMIT 1", [farm_id])

        if not r and not da:
            logger.info(f"❌ Report Generation Failed: No risk data found for farm_id: {farm_id} (No assessments or drone analysis)")
            response.status_code = 404
            return {"error": "No risk data found for this farm."}

        overall_risk_score = r.get("overall_risk_score") if r else None
        if overall_risk_score is None:
            overall_risk_score = 75 if (da and da.get("disease_type")) else 0
            
        detected_disease = da.get("disease_type") if da else "Blast"
        annotated_image = da.get("annotated_image_reference") if da else None
        image_reference = da.get("image_reference") if da else None  # fallback original image
            
        cost_row = db_get("SELECT report_data FROM reports WHERE farm_id = ? AND report_data IS NOT NULL ORDER BY generated_date DESC LIMIT 1", [farm_id])
        cost_info = None
        if cost_row and cost_row.get("report_data"):
            try:
                parsed = json.loads(cost_row["report_data"])
                primary = parsed.get("costData", {}).get("primary", {})
                if primary:
                    cost_info = {
                        "medicine_name": primary.get("medicine"),
                        "medicine_cost": primary.get("medicineCost"),
                        "equipment_cost": primary.get("equipmentCost"),
                        "application_cost": primary.get("applicationCost"),
                        "total_min": primary.get("totalMin"),
                        "total_max": primary.get("totalMax")
                    }
            except Exception:
                pass
                
        logger.info(f"📑 Generating enhanced report for Farm #{farm_id} ({farm.get('farmer_name')})...")
        
        try:
            rec_str = r.get("recommendation_json") if r else None
            if rec_str:
                recommendation = json.loads(rec_str)
            else:
                recommendation = { "action": "Manual analysis needed" }
        except Exception:
            recommendation = { "action": "Manual analysis needed" }
            
        risk_level = 'CRITICAL' if overall_risk_score > 75 else ('HIGH' if overall_risk_score > 50 else 'MEDIUM')
            
        report_data = {
            "field_name": farm.get("farmer_name"),
            "risk_score": overall_risk_score,
            "risk_level": risk_level,
            "dominant_disease": detected_disease,
            "annotated_image": annotated_image,
            "image_reference": image_reference,  # fallback if annotated doesn't exist
            "cost_data": cost_info,
            "recommendation": recommendation,
            "explainability": [
                "Environmental suitability for fungi is high",
                "Neighboring zones report infection spread",
                "Daily risk trend is accelerating"
            ]
        }
        
        try:
            logger.info("- Creating PDF...")
            pdf = await report_engine.generate_pdf(report_data, language, req.source_type)
            
            logger.info("- Creating WhatsApp Cards...")
            card = await report_engine.generate_whatsapp_cards(report_data, language)
            
            logger.info("- Saving to database...")
            insert_sql = """
                INSERT INTO reports (farm_id, title, file_path, card_path, status) 
                VALUES (?, ?, ?, ?, ?)
            """
            title = 'వరి చిత్ర నివేదిక' if language == 'te' else 'Paddy Health Report'
            
            res_ins = db_run(insert_sql, [farm_id, title, pdf["reportId"], card["cardId"], 'Ready'])
            logger.info(f"✅ Report #{res_ins['lastID']} ready.")
            
            return {
                "message": "Report generated successfully",
                "report_id": res_ins["lastID"],
                "pdf_url": f"/reports/download/{pdf['reportId']}",
                "card_url": f"/reports/cards/{card['cardId']}",
                "risk_score": report_data["risk_score"],
                "risk_level": report_data["risk_level"]
            }
        except Exception as engine_err:
            logger.error(f"❌ Engine Failure: {engine_err}")
            response.status_code = 500
            return {"error": f"Rendering engine failure: {engine_err}"}
            
    except Exception as e:
        logger.error(f"❌ Route Failure: {e}")
        response.status_code = 500
        return {"error": str(e)}


@router.get("/download/{filename}")
def download_pdf(filename: str, response: Response):
    file_path = REPORTS_DIR / f"{filename}.pdf"
    if not file_path.exists():
        response.status_code = 404
        return {"error": "Report not found"}
    return FileResponse(file_path, filename=f"{filename}.pdf", media_type="application/pdf")

@router.get("/cards/{filename}")
def download_card(filename: str, response: Response):
    file_path = REPORTS_DIR / f"{filename}.png"
    if not file_path.exists():
        response.status_code = 404
        return {"error": "Card not found"}
    return FileResponse(file_path, filename=f"{filename}.png", media_type="image/png")
