import random
import datetime

import config.disease_rules as rules

class DecisionEngine:
    async def analyze(self, scan_data, weather_data, soil_data, history_data, crop_stage='tillering'):
        dss = self.calculate_dss(scan_data)
        wri = self.calculate_wri(weather_data)
        ssi = self.calculate_ssi(soil_data)
        htf = self.calculate_htf(history_data)

        stage_multiplier = rules.crop_stage_multipliers.get(crop_stage, 1.0)
        
        raw_risk = (
            (dss * rules.weights["disease_pressure"]) +
            (wri * rules.weights["weather_risk"]) +
            (ssi * rules.weights["soil_stress"]) +
            (htf * rules.weights["history_trend"])
        ) * stage_multiplier

        overall_risk = min(round(raw_risk), 100)
        dominant_disease = self.get_dominant_disease(scan_data.get("detections", []))
        recommendation = self.generate_recommendation(dominant_disease, overall_risk, weather_data, crop_stage)

        explainability = [
            f"Disease Severity (DSS): {round(dss)}/100 based on area coverage and confidence.",
            f"Weather Risk (WRI): {round(wri)}/100 based on rain/humidity forecast.",
            f"Soil Stress (SSI): {round(ssi)}/100 based on moisture and water levels.",
            f"Trend Factor (HTF): {round(htf)}/100 based on weekly increase.",
            f"Crop Stage Multiplier: x{stage_multiplier} ({crop_stage})."
        ]

        return {
            "risk_score": overall_risk,
            "risk_level": self.get_risk_level(overall_risk),
            "breakdown": {
                "dss": round(dss),
                "wri": round(wri),
                "ssi": round(ssi),
                "htf": round(htf)
            },
            "dominant_disease": dominant_disease,
            "recommendation": recommendation,
            "explainability": explainability
        }

    def get_risk_level(self, score):
        if score >= rules.thresholds["critical"]: return "CRITICAL"
        if score >= rules.thresholds["high"]: return "HIGH"
        if score >= rules.thresholds["medium"]: return "MEDIUM"
        return "LOW"

    def calculate_dss(self, scan_data):
        detections = scan_data.get("detections", [])
        if not detections:
            return 0

        total_bbox_area = 0
        sum_confidence = 0

        for d in detections:
            area_px = d.get("area_px", 0)
            bbox = d.get("bbox", [])
            if not area_px and isinstance(bbox, list) and len(bbox) >= 4:
                area_px = bbox[2] * bbox[3]
            total_bbox_area += area_px
            sum_confidence += d.get("confidence", 0)

        image_area = scan_data.get("image_area_px", 640 * 640)
        infection_area_percent = (total_bbox_area / image_area) * 100 if image_area > 0 else 0
        
        count = len(detections)
        mean_conf = sum_confidence / count if count > 0 else 0

        area_score = (infection_area_percent / 20) * 100
        density_score = (count / 10) * 100
        severity = (area_score * 0.7) + (density_score * 0.3)

        return min(severity, 100)

    def calculate_wri(self, weather):
        if not weather: return 0
        score = 0
        
        rain_prob = weather.get("rain_prob", 0)
        if rain_prob > 60: score += 40
        elif rain_prob > 30: score += 20
            
        humidity = weather.get("humidity", 0)
        if humidity > 85: score += 30
        elif humidity > 70: score += 15

        temp_c = weather.get("temp_c", 0)
        if 25 <= temp_c <= 32: score += 30

        return min(score, 100)


    def calculate_ssi(self, soil):
        if not soil: return 0
        score = 0

        moisture = soil.get("moisture", 0)
        if moisture < 30: score += 50
        elif moisture < 50: score += 25

        water_level = soil.get("water_level")
        if water_level is not None:
            if water_level < 1.0: score += 30
            elif water_level > 15.0: score += 10

        temp = soil.get("temperature", 0)
        if temp and temp > 35: score += 20

        return min(score, 100)

    def calculate_htf(self, history):
        if not history: return 0

        curr = history.get("last_7_days_count", 0)
        prev = history.get("prev_7_days_count", 0)

        if curr == 0: return 0
        if prev == 0: return 30

        pct_change = ((curr - prev) / prev) * 100

        if pct_change > 50: return 100
        if pct_change > 20: return 60
        if pct_change > 0: return 20

        return 0

    def get_dominant_disease(self, detections):
        if not detections: return None
        counts = {}
        for d in detections:
            c_name = d.get("class_name")
            counts[c_name] = counts.get(c_name, 0) + 1
        return max(counts, key=counts.get)

    def generate_recommendation(self, disease, risk_score, weather, crop_stage):
        if not disease or risk_score < rules.thresholds["low"]:
            return {
                "action": "MONITOR",
                "message": "Conditions stable. Routine monitoring recommended.",
                "pesticide_category": "none",
                "dosage_per_acre_ml": 0,
                "best_spray_window": []
            }

        action = "MONITOR"
        if risk_score >= rules.thresholds["critical"]: action = "CONSULT_AGRI_OFFICER"
        elif risk_score > rules.thresholds["medium"]: action = "SPRAY"
        elif risk_score > rules.thresholds["low"]: action = "REDUCE_IRRIGATION"

        disease_key = disease.lower() if disease else ""
        rule = rules.rules.get(disease_key) or rules.rules.get("blast")

        pesticide_category = "fungicide"
        if "bacterial" in disease_key: pesticide_category = "bactericide"
        if any(w in disease_key for w in ["insect", "borer", "hispa"]):
            pesticide_category = "insecticide"

        product = rule.get("organic")
        dosage = 0

        if risk_score > rules.thresholds["high"]:
            product = rule.get("severe_chemical")
            dosage = rule.get("severe_dosage", 0)
        elif risk_score > rules.thresholds["medium"]:
            product = rule.get("chemical")
            dosage = rule.get("chemical_dosage", 0)

        spray_info = self.determine_best_spray_window(weather)

        return {
            "action": action,
            "risk_context": f"Risk is {self.get_risk_level(risk_score)} due to {disease} detection ({round(risk_score)}%).",
            "pesticide_category": pesticide_category,
            "treatment": {
                "product_name": product,
                "dosage_per_acre": f"{dosage}g or ml in {rule.get('dosage_base')}L water"
            },
            "best_spray_window": spray_info["windows"],
            "constraints_analysis": spray_info["analysis"]
        }

    def determine_best_spray_window(self, weather):
        forecast = weather.get("hourly_forecast") or self.generate_mock_forecast(weather)
        
        safe_windows = []
        for f in forecast:
            issues = []
            if f.get("rain_prob", 0) > 20: issues.append("Rain Risk")
            if f.get("wind_speed", 0) > rules.constraints["max_wind_speed_kph"]: issues.append("High Wind")
            if f.get("temp_c", 0) > rules.constraints["max_temp_c"]: issues.append("High Heat")

            if not issues:
                safe_windows.append({
                    "time": f.get("time"),
                    "condition": "Excellent",
                    "temp": f.get("temp_c"),
                    "wind": f.get("wind_speed")
                })

        return {
            "windows": safe_windows[:3] if safe_windows else ["No safe window in next 24h due to weather risks."],
            "analysis": "Prioritized times with low wind (<15kph) and no rain forecast."
        }

    def generate_mock_forecast(self, current):
        slots = []
        now = datetime.datetime.now()
        for i in range(1, 25):
            t = now + datetime.timedelta(hours=i)
            hour = t.hour
            is_day = 6 < hour < 18
            temp_mod = 5 if is_day else -5
            wind_mod = 5 if is_day else -2

            slots.append({
                "time": t.strftime("%I:%M %p"),
                "temp_c": current.get("temp_c", 28) + (random.random() * 2 + temp_mod),
                "wind_speed": current.get("wind_speed", 10) + (random.random() * 4 + wind_mod),
                "rain_prob": current.get("rain_prob", 20) * random.random()
            })
        return slots

precision_engine = DecisionEngine()
