/**
 * Prediction Engine for Paddy Disease Management
 * Forecasts outbreak probabilities for 7d and 14d horizons.
 */

const rules = {
    thresholds: {
        outbreak: 60, // Risk score above this is an "outbreak"
        warning: 40
    },
    weather_factors: {
        blast: { temp_min: 22, temp_max: 30, humidity_min: 85 },
        brown_spot: { temp_min: 25, temp_max: 35, humidity_min: 80 }
    }
};

class PredictionEngine {
    constructor() { }

    /**
     * Analyze a specific zone to predict future risk.
     * @param {Object} history - Array of {timestamp, severity_score}
     * @param {Object} sensorData - {humidity_avg_3d, temp_avg_3d, moisture_current}
     * @param {Object} forecast - {rain_prob, humidity_avg, temp_avg} (next 72h)
     */
    async predict(history = [], sensorData = {}, forecast = {}, cropStage = 'tillering') {
        const reasons = [];
        let score7d = 0;
        let score14d = 0;

        // 1. Feature: Severity Trend (Growth Velocity)
        const trend = this.calculateTrend(history);
        if (trend > 0) {
            const trendContribution = Math.min(trend * 20, 40); // Max 40% from trend
            score7d += trendContribution;
            score14d += trendContribution * 1.5;
            reasons.push(`Infection severity increased by ${Math.round(trend * 100)}% over the last week.`);
        }

        // 2. Feature: Environmental Suitability (Forecast + Sensor history)
        const envRisk = this.evaluateEnvSuitability(sensorData, forecast);
        if (envRisk > 0) {
            score7d += envRisk * 0.4;
            score14d += envRisk * 0.6;
            if (envRisk > 20) {
                reasons.push("Upcoming weather (high humidity/temp) is highly conducive for fungal spread.");
            }
        }

        // 3. Feature: Plant Stress (Sensors)
        if (sensorData.moisture_current < 30) {
            score7d += 15;
            score14d += 20;
            reasons.push("Low soil moisture identified; plants are currently under stress and vulnerable.");
        }

        // 4. Feature: Crop Stage Multiplier
        const stageMultipliers = { seedling: 1.2, tillering: 1.5, flowering: 1.3, maturity: 1.0 };
        const multiplier = stageMultipliers[cropStage] || 1.0;

        score7d *= multiplier;
        score14d *= multiplier;

        // Cap at 100
        const prob7d = Math.min(Math.round(score7d), 100);
        const prob14d = Math.min(Math.round(score14d), 100);

        return {
            prob_7d: prob7d,
            prob_14d: prob14d,
            confidence: history.length > 5 ? 0.85 : 0.60,
            reasons: reasons.slice(0, 3), // Top 3
            level: this.determineLevel(prob7d)
        };
    }

    calculateTrend(history) {
        if (history.length < 2) return 0;
        const sorted = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const current = sorted[0].severity_score;
        const previous = sorted[1].severity_score;
        if (previous === 0) return current > 0 ? 0.5 : 0;
        return (current - previous) / previous;
    }

    evaluateEnvSuitability(sensor, forecast) {
        let risk = 0;
        // High humidity hours (simulated by avg)
        if (forecast.humidity_avg > 85) risk += 30;
        else if (forecast.humidity_avg > 75) risk += 15;

        // Temp window
        if (forecast.temp_avg >= 24 && forecast.temp_avg <= 30) risk += 20;

        // Rain
        if (forecast.rain_prob > 60) risk += 10;

        return risk;
    }

    determineLevel(prob) {
        if (prob >= 75) return 'CRITICAL';
        if (prob >= 50) return 'HIGH';
        if (prob >= 25) return 'MEDIUM';
        return 'LOW';
    }
}

module.exports = new PredictionEngine();
