# Advanced Precision Decision Engine

## Design Logic

The Decision Engine fuses multi-modal data to compute a Unified Risk Score.

**Inputs:**
1. **Drone Vision:** Disease area coverage per frame, Detection count.
2. **IoT Sensors:** Soil Moisture, Water Level, Micro-climate (Temp/Hum).
3. **Weather Service:** 72h Forecast (Rain, Wind).
4. **Historical Data:** Epidemic trend analysis (WoW growth).

## Formulas

### 1. Disease Severity Score (DSS) [Weight: 0.5]
$$
DSS = min(100, (\%AreaCoverage \times 3.5) + (DetectionCount \times 3))
$$
*Rationale:* Area coverage is the primary indicator of severity.

### 2. Weather Risk Index (WRI) [Weight: 0.25]
$$
WRI = RainProbScore + HumidityScore + TempScore
$$
*   Rain > 60% = +40 pts
*   Humidity > 85% = +30 pts
*   Temp 25-32°C = +30 pts

### 3. Soil Stress Index (SSI) [Weight: 0.15]
$$
SSI = MoistureStress + WaterLevelStress
$$
*   Moisture < 30% = +50 pts (Drought makes plants susceptible to Brown Spot)
*   Water Level < 1cm = +30 pts

### 4. History Trend Factor (HTF) [Weight: 0.1]
$$
HTF = \%Increase \times Factor
$$
*   >50% increase WoW = 100 pts (Outbreak)

## JSON Output Schema

```json
{
  "risk_score": 95,
  "risk_level": "CRITICAL",
  "breakdown": {
    "dss": 80,
    "wri": 90,
    "ssi": 40,
    "htf": 100
  },
  "dominant_disease": "blast",
  "recommendation": {
    "action": "CONSULT_AGRI_OFFICER",
    "risk_context": "Risk is CRITICAL due to blast detection (95%).",
    "pesticide_category": "fungicide",
    "treatment": {
      "product_name": "Isoprothiolane 40 EC",
      "dosage_per_acre": "300g or ml in 200L water"
    },
    "best_spray_window": [
      {
        "time": "07:00 AM",
        "condition": "Excellent",
        "temp": 24,
        "wind": 5
      }
    ],
    "constraints_analysis": "Prioritized times with low wind (<15kph) and no rain forecast."
  },
  "explainability": [
    "Disease Severity (DSS): 80/100 based on area coverage and confidence.",
    "Weather Risk (WRI): 90/100 based on rain/humidity forecast.",
    "Trend Factor (HTF): 100/100 based on weekly increase."
  ]
}
```
