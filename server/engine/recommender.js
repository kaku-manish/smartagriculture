// Simple Rule-Based Recommendation Engine

function generateRecommendation(farm, iot, drone, kbCrops, kbDiseases) {
    let recommendation = {
        crop_suggestion: "Keep monitoring",
        water_advice: "Check water levels",
        disease_detected: "None",
        medicine_suggestion: "None",
        medicine_secondary: "None",
        dosage: "N/A",
        preventive_measures: "Monitor regularly",
        timeline: "Monitor regularly",
        // New fields for UI
        confidence: 0,
        severity: "Low",
        image_reference: null,
        annotated_image_reference: null // If available
    };

    // 1. Crop Suggestion
    if (farm.current_crop === 'None' || farm.current_crop === '') {
        const soilRec = kbCrops.find(c => c.soil_type === farm.soil_type);
        if (soilRec) {
            recommendation.crop_suggestion = `Recommended: ${soilRec.recommended_crop}`;
        }
    } else {
        recommendation.crop_suggestion = `Current Crop: ${farm.current_crop}`;
    }

    // 2. Water Advice
    if (iot) {
        if (iot.water_level < 5.0) {
            recommendation.water_advice = "water_low";
        } else if (iot.water_level > 10.0) {
            recommendation.water_advice = "water_high";
        } else {
            recommendation.water_advice = "water_optimal";
        }
    }

    // 3. Disease & Medicine & Image Data
    if (drone) {
        recommendation.disease_detected = drone.disease_type;
        recommendation.confidence = drone.confidence || 0;
        recommendation.severity = drone.severity || "Unknown";
        // Ensure paths are web-accessible if they are relative
        recommendation.image_reference = drone.image_reference;
        recommendation.annotated_image_reference = drone.annotated_image_reference;

        // Normalize for lookup
        const normalize = (str) => str.toLowerCase().replace(/_/g, ' ').trim();
        const target = normalize(drone.disease_type);

        const diseaseRule = kbDiseases.find(d =>
            normalize(d.disease_name) === target ||
            normalize(d.disease_name).includes(target) ||
            target.includes(normalize(d.disease_name))
        );

        if (diseaseRule) {
            recommendation.medicine_suggestion = diseaseRule.medicine;
            recommendation.medicine_secondary = diseaseRule.medicine_secondary;
            recommendation.dosage = diseaseRule.dosage;
            recommendation.preventive_measures = diseaseRule.preventive_measures;
            recommendation.timeline = diseaseRule.timeline;
        } else if (drone.disease_type !== 'Healthy' && drone.disease_type !== 'Normal') {
            recommendation.medicine_suggestion = "Consult local expert";
            recommendation.dosage = "N/A";
            recommendation.preventive_measures = "Quarantine affected area";
            recommendation.timeline = "Immediate action required";
        }
    }

    return recommendation;
}

module.exports = { generateRecommendation };
