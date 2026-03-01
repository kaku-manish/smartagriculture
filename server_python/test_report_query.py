import json
from database import db_get, db_run

db_run("INSERT INTO users (full_name, role, username, password_hash) VALUES ('Test Farmer', 'farmer', 'testuser99', 'xxx')", [])
user_id = db_get("SELECT id FROM users WHERE username='testuser99'")["id"]

db_run("INSERT INTO farms (user_id, farmer_name) VALUES (?, 'Test Farmer')", [user_id])
farm_id = db_get("SELECT farm_id FROM farms WHERE user_id=?", [user_id])["farm_id"]

db_run("INSERT INTO drone_analysis (farm_id, disease_type, severity) VALUES (?, 'Test Disease', 'HIGH')", [farm_id])

sql = """
    SELECT 
        r.*, f.farmer_name as field_name,
        da.annotated_image_reference as annotated_image,
        da.disease_type as detected_disease
    FROM farms f
    LEFT JOIN disease_risk_assessments r ON r.zone_id = f.farm_id
    LEFT JOIN drone_analysis da ON da.farm_id = f.farm_id
    WHERE f.farm_id = ? 
    ORDER BY da.analysis_date DESC, r.timestamp DESC LIMIT 1
"""
data = db_get(sql, [farm_id])
print("\nRisk Data for new user:", json.dumps(data, indent=2))
