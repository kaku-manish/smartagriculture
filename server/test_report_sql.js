const db = require('./database');
const farm_id = 20;

const sql = `
            SELECT 
                r.*, f.farmer_name as field_name,
                da.annotated_image_reference as annotated_image,
                da.disease_type as detected_disease
            FROM farms f
            LEFT JOIN disease_risk_assessments r ON r.zone_id = f.farm_id
            LEFT JOIN drone_analysis da ON da.farm_id = f.farm_id
            WHERE f.farm_id = ? 
            ORDER BY r.timestamp DESC, da.analysis_date DESC LIMIT 1
        `;

db.get(sql, [farm_id], async (err, riskData) => {
    if (err) console.error(err);
    console.log(riskData);
});
