import asyncio
import json
from database import db_get
from engine.report_engine import report_engine

async def test():
    # Farm 6 has annotated_image (let's use it)
    da = db_get("SELECT * FROM drone_analysis WHERE annotated_image_reference IS NOT NULL ORDER BY analysis_date DESC LIMIT 1")
    farm = db_get("SELECT * FROM farms WHERE farm_id = ?", [da["farm_id"]])
    
    report_data = {
        "field_name": farm["farmer_name"],
        "risk_score": 75,
        "risk_level": "HIGH",
        "dominant_disease": da["disease_type"],
        "annotated_image": da.get("annotated_image_reference"),
        "image_reference": da.get("image_reference"),
        "recommendation": {"action": "SPRAY", "treatment": {"product_name": "Tricyclazole", "dosage_per_acre": "120g/200L"}},
    }
    
    print(f"Testing with: farm={farm['farmer_name']}, disease={da['disease_type']}")
    print(f"  annotated_image: {da.get('annotated_image_reference')}")
    
    pdf = await report_engine.generate_pdf(report_data, "en")
    print(f"\n✅ PDF generated: {pdf['filePath']}")
    
    card = await report_engine.generate_whatsapp_cards(report_data, "en")
    print(f"✅ Card generated: {card['squarePath']}")

asyncio.run(test())
