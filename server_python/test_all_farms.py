import json
from database import db_get

for farm_id in range(1, 10):
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
    risk_data = db_get(sql, [farm_id])
    if risk_data:
        cond = not risk_data or (not risk_data.get("overall_risk_score") and not risk_data.get("detected_disease"))
        print(f"Farm {farm_id}: cond={cond}, data={json.dumps(risk_data)}")
