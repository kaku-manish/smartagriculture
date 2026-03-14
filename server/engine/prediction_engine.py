class PredictionEngine:
    def __init__(self):
        self.rules = {
            "thresholds": {"outbreak": 60, "warning": 40},
            "weather_factors": {
                "blast": {"temp_min": 22, "temp_max": 30, "humidity_min": 85},
                "brown_spot": {"temp_min": 25, "temp_max": 35, "humidity_min": 80}
            }
        }

    async def predict(self, history=None, sensor_data=None, forecast=None, crop_stage="tillering"):
        history = history or []
        sensor_data = sensor_data or {}
        forecast = forecast or {}

        reasons = []
        score7d = 0
        score14d = 0

        trend = self.calculate_trend(history)
        if trend > 0:
            trend_contribution = min(trend * 20, 40)
            score7d += trend_contribution
            score14d += trend_contribution * 1.5
            reasons.append(f"Infection severity increased by {round(trend * 100)}% over the last week.")

        env_risk = self.evaluate_env_suitability(sensor_data, forecast)
        if env_risk > 0:
            score7d += env_risk * 0.4
            score14d += env_risk * 0.6
            if env_risk > 20:
                reasons.append("Upcoming weather (high humidity/temp) is highly conducive for fungal spread.")

        if sensor_data.get("moisture_current", 100) < 30:
            score7d += 15
            score14d += 20
            reasons.append("Low soil moisture identified; plants are currently under stress and vulnerable.")

        stage_multipliers = {"seedling": 1.2, "tillering": 1.5, "flowering": 1.3, "maturity": 1.0}
        multiplier = stage_multipliers.get(crop_stage, 1.0)

        score7d *= multiplier
        score14d *= multiplier

        prob7d = min(round(score7d), 100)
        prob14d = min(round(score14d), 100)

        return {
            "prob_7d": prob7d,
            "prob_14d": prob14d,
            "confidence": 0.85 if len(history) > 5 else 0.60,
            "reasons": reasons[:3],
            "level": self.determine_level(prob7d)
        }

    def calculate_trend(self, history):
        if len(history) < 2: return 0
        
        def safe_date(ts):
            from datetime import datetime
            if isinstance(ts, str):
                return datetime.fromisoformat(ts.replace('Z', '+00:00'))
            return ts
            
        sorted_history = sorted(history, key=lambda x: safe_date(x["timestamp"]), reverse=True)
        current = sorted_history[0].get("severity_score", 0)
        previous = sorted_history[1].get("severity_score", 0)
        
        if previous == 0: return 0.5 if current > 0 else 0
        return (current - previous) / previous

    def evaluate_env_suitability(self, sensor, forecast):
        risk = 0
        humidity_avg = forecast.get("humidity_avg", 0)
        temp_avg = forecast.get("temp_avg", 0)
        rain_prob = forecast.get("rain_prob", 0)

        if humidity_avg > 85: risk += 30
        elif humidity_avg > 75: risk += 15

        if 24 <= temp_avg <= 30: risk += 20
        if rain_prob > 60: risk += 10

        return risk

    def determine_level(self, prob):
        if prob >= 75: return "CRITICAL"
        if prob >= 50: return "HIGH"
        if prob >= 25: return "MEDIUM"
        return "LOW"

prediction_engine = PredictionEngine()
