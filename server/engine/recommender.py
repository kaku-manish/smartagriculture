def generate_recommendation(farm: dict, iot: dict, drone: dict, kb_crops: list, kb_diseases: list) -> dict:
    recommendation = {
        "crop_suggestion": "Keep monitoring",
        "water_advice": "Check water levels",
        "disease_detected": "None",
        "medicine_suggestion": "None",
        "medicine_secondary": "None",
        "dosage": "N/A",
        "preventive_measures": "Monitor regularly",
        "timeline": "Monitor regularly",
        "confidence": 0,
        "severity": "Low",
        "image_reference": None,
        "annotated_image_reference": None
    }

    current_crop = farm.get("current_crop", "")
    if current_crop == "None" or current_crop == "":
        soil_rec = next((c for c in kb_crops if c.get("soil_type") == farm.get("soil_type")), None)
        if soil_rec:
            recommendation["crop_suggestion"] = f"Recommended: {soil_rec.get('recommended_crop')}"
    else:
        recommendation["crop_suggestion"] = f"Current Crop: {current_crop}"

    if iot:
        water_level = iot.get("water_level", 0.0)
        if water_level < 5.0:
            recommendation["water_advice"] = "water_low"
        elif water_level > 10.0:
            recommendation["water_advice"] = "water_high"
        else:
            recommendation["water_advice"] = "water_optimal"

    if drone:
        disease_type = drone.get("disease_type", "")
        recommendation["disease_detected"] = disease_type
        recommendation["confidence"] = drone.get("confidence", 0)
        recommendation["severity"] = drone.get("severity", "Unknown")
        recommendation["image_reference"] = drone.get("image_reference")
        recommendation["annotated_image_reference"] = drone.get("annotated_image_reference")

        def normalize(s: str) -> str:
            return s.lower().replace("_", " ").strip() if s else ""

        target = normalize(disease_type)
        
        disease_rule = None
        for d in kb_diseases:
            d_name = normalize(d.get("disease_name", ""))
            if d_name == target or target in d_name or d_name in target:
                disease_rule = d
                break

        if disease_rule:
            recommendation["medicine_suggestion"] = disease_rule.get("medicine")
            recommendation["medicine_secondary"] = disease_rule.get("medicine_secondary")
            recommendation["dosage"] = disease_rule.get("dosage")
            recommendation["preventive_measures"] = disease_rule.get("preventive_measures")
            recommendation["timeline"] = disease_rule.get("timeline")
        elif disease_type != 'Healthy' and disease_type != 'Normal':
            recommendation["medicine_suggestion"] = "Consult local expert"
            recommendation["dosage"] = "N/A"
            recommendation["preventive_measures"] = "Quarantine affected area"
            recommendation["timeline"] = "Immediate action required"

    return recommendation
