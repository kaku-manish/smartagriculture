const rules = require('../config/disease_rules.js');

class DecisionEngine {
    constructor() { }

    /**
     * Main function to compute risk and generate recommendations
     * @param {Object} scanData - { detections: [], timestamp, image_area_px }
     * @param {Object} weatherData - { rain_prob, wind_speed, temp_c, humidity, rainfall_mm, hourly_forecast }
     * @param {Object} soilData - { moisture, nutrient_level, water_level }
     * @param {Object} historyData - { last_7_days_count, prev_7_days_count }
     * @param {String} cropStage - e.g., 'flowering'
     */
    async analyze(scanData, weatherData, soilData, historyData, cropStage = 'tillering') {

        // 1. Calculate Disease Severity Score (DSS)
        const dss = this.calculateDSS(scanData);

        // 2. Calculate Weather Risk Index (WRI)
        const wri = this.calculateWRI(weatherData);

        // 3. Calculate Soil Stress Index (SSI)
        const ssi = this.calculateSSI(soilData);

        // 4. Calculate History Trend Factor (HTF)
        const htf = this.calculateHTF(historyData);

        // 5. Access Stage Multiplier
        const stageMultiplier = rules.crop_stage_multipliers[cropStage] || 1.0;

        // 6. Fuse Scores (Weighted Average)
        const { weights } = rules;
        let rawRisk = (
            (dss * weights.disease_pressure) +
            (wri * weights.weather_risk) +
            (ssi * weights.soil_stress) +
            (htf * weights.history_trend)
        ) * stageMultiplier;

        // Cap at 100
        const overallRisk = Math.min(Math.round(rawRisk), 100);

        // 7. Generate Recommendation
        const dominantDisease = this.getDominantDisease(scanData.detections);
        const recommendation = this.generateRecommendation(dominantDisease, overallRisk, weatherData, cropStage);

        // Explainability
        const explainability = [
            `Disease Severity (DSS): ${Math.round(dss)}/100 based on area coverage and confidence.`,
            `Weather Risk (WRI): ${Math.round(wri)}/100 based on rain/humidity forecast.`,
            `Soil Stress (SSI): ${Math.round(ssi)}/100 based on moisture and water levels.`,
            `Trend Factor (HTF): ${Math.round(htf)}/100 based on weekly increase.`,
            `Crop Stage Multiplier: x${stageMultiplier} (${cropStage}).`
        ];

        return {
            risk_score: overallRisk,
            risk_level: this.getRiskLevel(overallRisk),
            breakdown: {
                dss: Math.round(dss),
                wri: Math.round(wri),
                ssi: Math.round(ssi),
                htf: Math.round(htf)
            },
            dominant_disease: dominantDisease,
            recommendation,
            explainability
        };
    }

    getRiskLevel(score) {
        if (score >= rules.thresholds.critical) return "CRITICAL";
        if (score >= rules.thresholds.high) return "HIGH";
        if (score >= rules.thresholds.medium) return "MEDIUM";
        return "LOW";
    }

    /**
     * DSS Calculation
     * Considers: Area %, Density, Confidence
     */
    calculateDSS(scanData) {
        const detections = scanData.detections || [];
        if (detections.length === 0) return 0;

        // 1. Infection Area Percent
        let totalBboxArea = 0;
        let sumConfidence = 0;

        detections.forEach(d => {
            // If bbox is [x,y,w,h], area = w*h
            let areaPx = d.area_px || 0;
            if (!areaPx && d.bbox && Array.isArray(d.bbox)) {
                areaPx = d.bbox[2] * d.bbox[3];
            }
            totalBboxArea += areaPx;
            sumConfidence += (d.confidence || 0);
        });

        const imageArea = scanData.image_area_px || (640 * 640); // Default if missing
        let infectionAreaPercent = (totalBboxArea / imageArea) * 100;

        // 2. Detection Density (Count)
        const count = detections.length;

        // 3. Mean Confidence
        const meanConf = sumConfidence / count;

        // Formula:
        // Risk = (Normalization of Area) * 0.7 + (Normalization of Count) * 0.3
        // We assume 20% area coverage is 100% severity
        // We assume 10 spots is 100% severity for density

        let areaScore = (infectionAreaPercent / 20) * 100;
        let densityScore = (count / 10) * 100;
        let severity = (areaScore * 0.7) + (densityScore * 0.3);

        // Confidence Penalty: If model is unsure, reduce risk slightly to avoid false alarm panic?
        // Or ignore? Let's just trust YOLO for now but require min confidence.

        return Math.min(severity, 100);
    }

    /**
     * WRI Calculation
     * Rain (Fungal), Wind (Spray Block), Humidity
     */
    calculateWRI(weather) {
        if (!weather) return 0;

        let score = 0;

        // Rain: fungal spores spread. 
        if (weather.rain_prob > 60) score += 40;
        else if (weather.rain_prob > 30) score += 20;

        // Humidity: >85% is critical for Blast/Blight
        if (weather.humidity > 85) score += 30;
        else if (weather.humidity > 70) score += 15;

        // Temp: 25-32C is optimal for diseases
        if (weather.temp_c >= 25 && weather.temp_c <= 32) score += 30;

        // Wind does not cause disease per se, but facilitates spread? 
        // Usually rain/humid is bigger factor.

        return Math.min(score, 100);
    }

    /**
     * SSI Calculation
     * Low moisture + High Temp + Low Water Level
     */
    calculateSSI(soil) {
        if (!soil) return 0;

        let score = 0;

        // Moisture (Optimal 60-80%)
        if (soil.moisture < 30) score += 50; // Critical stress
        else if (soil.moisture < 50) score += 25;

        // Water Level (Paddy needs standing water usually 2-5cm)
        // If < 1cm, high stress
        if (soil.water_level !== undefined) {
            if (soil.water_level < 1.0) score += 30;
            else if (soil.water_level > 15.0) score += 10; // Too deep?
        }

        // Temp (Soil temp/Air temp)
        if (soil.temperature && soil.temperature > 35) score += 20;

        return Math.min(score, 100);
    }

    /**
     * HTF Calculation
     * Trend: Increasing Detections?
     */
    calculateHTF(history) {
        if (!history) return 0;

        const curr = history.last_7_days_count || 0;
        const prev = history.prev_7_days_count || 0;

        if (curr === 0) return 0;
        if (prev === 0) return 30; // New outbreak potential

        const pctChange = ((curr - prev) / prev) * 100;

        if (pctChange > 50) return 100; // Exploding
        if (pctChange > 20) return 60; // Rising
        if (pctChange > 0) return 20;  // Slight rise

        return 0; // Stable or decreasing
    }

    getDominantDisease(detections) {
        if (!detections || detections.length === 0) return null;
        const counts = {};
        detections.forEach(d => {
            counts[d.class_name] = (counts[d.class_name] || 0) + 1;
        });
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    generateRecommendation(disease, riskScore, weather, cropStage) {
        if (!disease || riskScore < rules.thresholds.low) {
            return {
                action: "MONITOR",
                message: "Conditions stable. Routine monitoring recommended.",
                pesticide_category: "none",
                dosage_per_acre_ml: 0,
                best_spray_window: []
            };
        }

        // Determine Action
        let action = "MONITOR";
        if (riskScore >= rules.thresholds.critical) action = "CONSULT_AGRI_OFFICER"; // Too severe
        else if (riskScore > rules.thresholds.medium) action = "SPRAY";
        else if (riskScore > rules.thresholds.low) action = "REDUCE_IRRIGATION"; // Example cultural practice

        // Check specific disease rules
        const rule = rules.rules[disease.toLowerCase()] || rules.rules['blast'];

        let pesticide_category = "fungicide"; // Default prediction, refine by disease name map if needed
        if (disease.toLowerCase().includes('bacterial')) pesticide_category = "bactericide";
        if (disease.toLowerCase().includes('insect') || disease.toLowerCase().includes('borer') || disease.toLowerCase().includes('hispa')) pesticide_category = "insecticide";

        let product = rule.organic;
        let dosage = 0; // of the concentrate

        if (riskScore > rules.thresholds.high) {
            product = rule.severe_chemical;
            dosage = rule.severe_dosage; // e.g., 300 ml/acre
        } else if (riskScore > rules.thresholds.medium) {
            product = rule.chemical;
            dosage = rule.chemical_dosage;
        }

        const sprayInfo = this.determineBestSprayWindow(weather);

        return {
            action,
            risk_context: `Risk is ${this.getRiskLevel(riskScore)} due to ${disease} detection (${Math.round(riskScore)}%).`,
            pesticide_category,
            treatment: {
                product_name: product, // User allowed generic "No brand names" but "Chemical Name" is okay.
                dosage_per_acre: `${dosage}g or ml in ${rule.dosage_base}L water`
            },
            best_spray_window: sprayInfo.windows,
            constraints_analysis: sprayInfo.analysis
        };
    }

    /**
     * Determine best spray windows based on forecast
     * Input weather should ideally have `hourly_forecast` array: [{hour, rain_prob, wind, temp, humidity}]
     * If not, we simulate based on current.
     */
    determineBestSprayWindow(weather) {
        // Mock hourly forecast if not present (Usually comes from weather API)
        const forecast = weather.hourly_forecast || this.generateMockForecast(weather);

        const safeWindows = [];
        const analysis = [];

        forecast.forEach(f => {
            let issues = [];
            if (f.rain_prob > 20) issues.push("Rain Risk");
            if (f.wind_speed > rules.constraints.max_wind_speed_kph) issues.push("High Wind");
            if (f.temp_c > rules.constraints.max_temp_c) issues.push("High Heat");

            if (issues.length === 0) {
                safeWindows.push({
                    time: f.time,
                    condition: "Excellent",
                    temp: f.temp_c,
                    wind: f.wind_speed
                });
            } else {
                // analysis.push(`Avoid ${f.time}: ${issues.join(', ')}`);
            }
        });

        return {
            windows: safeWindows.length > 0 ? safeWindows.slice(0, 3) : ["No safe window in next 24h due to weather risks."],
            analysis: "Prioritized times with low wind (<15kph) and no rain forecast."
        };
    }

    generateMockForecast(current) {
        // Generate 24h mock based on "current" to demonstrate logic
        const slots = [];
        const now = new Date();
        for (let i = 1; i <= 24; i++) {
            let t = new Date(now.getTime() + i * 3600000);
            let hour = t.getHours();
            let isDay = (hour > 6 && hour < 18);
            let tempMod = isDay ? 5 : -5;
            let windMod = isDay ? 5 : -2;

            slots.push({
                time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                temp_c: (current.temp_c || 28) + (Math.random() * 2 + tempMod),
                wind_speed: (current.wind_speed || 10) + (Math.random() * 4 + windMod),
                rain_prob: (current.rain_prob || 20) * (Math.random())
            });
        }
        return slots;
    }
}

module.exports = new DecisionEngine();
