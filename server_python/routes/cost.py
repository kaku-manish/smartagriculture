import re
import logging
from fastapi import APIRouter, Response
from pydantic import BaseModel
from typing import Optional

from database import db_get, db_all, db_run

router = APIRouter()
logger = logging.getLogger("agro-backend")

class MedicineUpdateReq(BaseModel):
    unit_price: float
    brand_name: str
    available: int = 1

class MedicineAddReq(BaseModel):
    medicine_name: str
    brand_name: str
    unit_price: float
    unit: str
    disease_name: Optional[str] = None

@router.get("/estimate/{farm_id}")
def estimate_cost(farm_id: int, response: Response):
    analysis_query = """
        SELECT disease_type, severity, confidence 
        FROM drone_analysis 
        WHERE farm_id = ? 
        ORDER BY analysis_date DESC 
        LIMIT 1
    """
    
    try:
        analysis = db_get(analysis_query, [farm_id])
        if not analysis or not analysis.get("disease_type"):
            return {
                "message": "No disease detected yet. Upload an image for analysis first.",
                "hasData": False
            }
            
        farm_query = "SELECT field_size, location, farmer_name FROM farms WHERE farm_id = ?"
        farm = db_get(farm_query, [farm_id])
        if not farm:
            response.status_code = 500
            return {"error": "Failed to fetch farm details"}
            
        disease_query = """
            SELECT medicine, medicine_secondary, dosage, timeline, preventive_measures
            FROM kb_diseases 
            WHERE LOWER(disease_name) = LOWER(?)
            LIMIT 1
        """
        disease = db_get(disease_query, [analysis["disease_type"]])
        
        if not disease:
            return {
                "message": "Treatment information not available for this disease",
                "hasData": False
            }
            
        price_query = """
            SELECT medicine_name, brand_name, unit_price, unit
            FROM medicine_prices
            WHERE LOWER(medicine_name) = LOWER(?) OR LOWER(medicine_name) = LOWER(?)
        """
        prices = db_all(price_query, [disease.get("medicine"), disease.get("medicine_secondary")])
        
        field_size = farm.get("field_size") or 1
        dosage_str = disease.get("dosage", "")
        
        def parse_dosage(d_str: str) -> float:
            match = re.search(r"(\d+\.?\d*)\s*(ml|g|kg|liter)?", d_str, re.IGNORECASE)
            if match:
                return float(match.group(1))
            return 0.0
            
        dosage_amount = parse_dosage(dosage_str)
        quantity_needed = dosage_amount * field_size
        
        lower_dosage = dosage_str.lower()
        if "ml" in lower_dosage:
            quantity_needed /= 1000.0
        elif "g" in lower_dosage and "kg" not in lower_dosage:
            quantity_needed /= 1000.0
            
        primary_price = next((p for p in prices if p["medicine_name"].lower() == disease.get("medicine", "").lower()), None)
        secondary_price = next((p for p in prices if p["medicine_name"].lower() == disease.get("medicine_secondary", "").lower()), None)
        
        primary_cost = (primary_price["unit_price"] * quantity_needed) if primary_price else 0
        secondary_cost = (secondary_price["unit_price"] * quantity_needed) if secondary_price else 0
        
        equipment_cost = 200 + (field_size * 50)
        application_cost = field_size * 150
        
        total_min = round(primary_cost + equipment_cost)
        total_max = round(primary_cost + equipment_cost + application_cost)
        
        alt_total_min = round(secondary_cost + equipment_cost)
        alt_total_max = round(secondary_cost + equipment_cost + application_cost)
        
        res_data = {
            "hasData": True,
            "disease": {
                "name": analysis["disease_type"],
                "severity": analysis.get("severity", "MEDIUM"),
                "confidence": f"{(analysis.get('confidence', 0) * 100):.1f}" if analysis.get("confidence") else "N/A"
            },
            "farm": {
                "size": field_size,
                "location": farm.get("location"),
                "farmerName": farm.get("farmer_name")
            },
            "primary": {
                "medicine": disease.get("medicine"),
                "brand": primary_price.get("brand_name", "Generic") if primary_price else "Generic",
                "dosage": disease.get("dosage"),
                "unitPrice": primary_price.get("unit_price", 0) if primary_price else 0,
                "unit": primary_price.get("unit", "liter") if primary_price else "liter",
                "quantityNeeded": f"{quantity_needed:.2f}",
                "medicineCost": round(primary_cost),
                "equipmentCost": equipment_cost,
                "applicationCost": application_cost,
                "totalMin": total_min,
                "totalMax": total_max
            },
            "alternative": None,
            "timeline": disease.get("timeline"),
            "preventiveMeasures": disease.get("preventive_measures")
        }
        
        if disease.get("medicine_secondary"):
            res_data["alternative"] = {
                "medicine": disease.get("medicine_secondary"),
                "brand": secondary_price.get("brand_name", "Generic") if secondary_price else "Generic",
                "unitPrice": secondary_price.get("unit_price", 0) if secondary_price else 0,
                "unit": secondary_price.get("unit", "liter") if secondary_price else "liter",
                "quantityNeeded": f"{quantity_needed:.2f}",
                "medicineCost": round(secondary_cost),
                "equipmentCost": equipment_cost,
                "applicationCost": application_cost,
                "totalMin": alt_total_min,
                "totalMax": alt_total_max
            }
            
        return res_data
    except Exception as e:
        logger.error(f"Cost estimation error: {e}")
        response.status_code = 500
        return {"error": "Failed to estimate costs"}

@router.get("/medicines")
def get_medicines(response: Response):
    query = "SELECT * FROM medicine_prices WHERE available = 1 ORDER BY medicine_name"
    try:
        rows = db_all(query)
        return rows
    except Exception as e:
        logger.error(f"Failed to fetch medicines: {e}")
        response.status_code = 500
        return {"error": "Failed to fetch medicines"}

@router.put("/medicine/{item_id}")
def update_medicine(item_id: int, req: MedicineUpdateReq, response: Response):
    query = """
        UPDATE medicine_prices 
        SET unit_price = ?, brand_name = ?, available = ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
    """
    try:
        res_info = db_run(query, [req.unit_price, req.brand_name, req.available, item_id])
        return {"message": "Medicine updated successfully", "changes": res_info["changes"]}
    except Exception as e:
        logger.error(f"Failed to update medicine: {e}")
        response.status_code = 500
        return {"error": "Failed to update medicine"}

@router.get("/diseases")
def get_diseases(response: Response):
    query = "SELECT DISTINCT disease_name FROM kb_diseases ORDER BY disease_name"
    try:
        rows = db_all(query)
        return [r["disease_name"] for r in rows if r.get("disease_name")]
    except Exception as e:
        logger.error(f"Failed to fetch diseases: {e}")
        response.status_code = 500
        return {"error": "Failed to fetch diseases"}

@router.post("/medicine")
def add_medicine(req: MedicineAddReq, response: Response):
    query = """
        INSERT INTO medicine_prices (medicine_name, brand_name, unit_price, unit, disease_name)
        VALUES (?, ?, ?, ?, ?)
    """
    try:
        res_info = db_run(query, [req.medicine_name, req.brand_name, req.unit_price, req.unit, req.disease_name])
        return {"message": "Medicine added successfully", "id": res_info["lastID"]}
    except Exception as e:
        logger.error(f"Failed to add medicine: {e}")
        response.status_code = 500
        return {"error": "Failed to add medicine"}

@router.get("/grouped-medicines")
def get_grouped_medicines(response: Response):
    # For SQLite, the LEFT JOIN alias scope differs slightly, so we'll use a safer cross query or perform logic in python.
    query = "SELECT * FROM medicine_prices ORDER BY medicine_name"
    try:
        mp_rows = db_all(query)
        kb_query = "SELECT DISTINCT medicine, medicine_secondary, disease_name FROM kb_diseases"
        kb_rows = db_all(kb_query)
        
        disease_map = {}
        for row in kb_rows:
            d_name = row.get("disease_name")
            if row.get("medicine"):
                disease_map[row["medicine"].lower()] = d_name
            if row.get("medicine_secondary"):
                disease_map[row["medicine_secondary"].lower()] = d_name
                
        grouped = {}
        for row in mp_rows:
            mp_disease = row.get("disease_name")
            mapped_disease = disease_map.get((row.get("medicine_name") or "").lower())
            
            d_key = mp_disease or mapped_disease or "Uncategorized"
            if d_key not in grouped:
                grouped[d_key] = []
                
            grouped[d_key].append({
                "id": row.get("id"),
                "medicine_name": row.get("medicine_name"),
                "brand_name": row.get("brand_name"),
                "unit_price": row.get("unit_price"),
                "unit": row.get("unit"),
                "available": row.get("available")
            })
            
        return grouped
    except Exception as e:
        logger.error(f"Failed to fetch grouped medicines: {e}")
        response.status_code = 500
        return {"error": "Failed to fetch grouped medicines"}
