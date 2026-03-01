# Precision Disease Management System

## A) Architecture Diagram

```mermaid
graph TD
    Client[Mobile/Web Client] -->|HTTP POST /scan-results| API[Node.js API Gateway]
    Client -->|HTTP POST /sensor-readings| API
    Client -->|HTTP GET /risk-summary| API
    
    subgraph "Precision Module"
        API --> Controller[Precision Controller]
        Controller --> Engine[Decision Engine]
        
        Engine -->|Input| Config[Disease Config (Rules/Weights)]
        Engine -->|Input| DB[(PostgreSQL Database)]
        Engine -->|Fetch| WeatherAPI[Weather Service (Mock/External)]
        
        Engine -->|Compute| Risk[Risk Scoring Algorithm]
        Engine -->|Compute| Recs[Recommendation Logic]
        
        Risk -->|Risk Score| DB
        Recs -->|Dosage/Timing| DB
    end
    
    subgraph "Data Sources"
        Drone[Drone/YOLO] -->|Detections| API
        IoT[IoT Sensors] -->|Telemetry| API
    end
```

**Workflow:**
1. **Data Ingestion:** Drone sends YOLO bounding boxes + GPS. IoT sends soil/env data. Weather is fetched.
2. **Fusion:** `Decision Engine` aggregates these independent data points for a specific Field/Zone.
3. **Analysis:** 
   - `Disease Severity` calculated from bbox confidence & area coverage.
   - `Environmental Risk` calculated from humidity, temp, and rain forecast.
   - `Crop Stage` acts as a multiplier (e.g., highly vulnerable at flowering).
4. **Output:** A unified Risk Score (0-100) and actionable Recommendation object (Chemical, Dosage, Time Window).

## B) Database Schema

The module introduces the following tables (PostgreSQL/SQLite compatible):

**1. `field_zones`**
- Sub-divisions of a farm for heatmap granularity.
- `zone_id` (PK), `farm_id` (FK), `coordinates` (Polygon/Point), `crop_stage` (Enum).

**2. `scan_batches`**
- Group of detections from a single drone flight.
- `batch_id` (PK), `zone_id` (FK), `timestamp`, `drone_id`.

**3. `scan_detections`**
- Individual YOLO results.
- `detection_id` (PK), `batch_id` (FK), `class_name` (e.g., 'blast', 'hispa'), `confidence` (0.0-1.0), `bbox` (json), `area_coverage_percent`.

**4. `weather_logs`**
- Cached forecast data.
- `weather_id` (PK), `zone_id` (FK), `forecast_date`, `rain_prob`, `humidity`, `wind_speed`.

**5. `disease_risk_assessments`**
- The output of the Decision Engine.
- `assessment_id` (PK), `zone_id` (FK), `timestamp`, `overall_risk_score` (0-100), `disease_pressure_score`, `weather_risk_score`, `soil_stress_score`, `recommendation_json` (Stores product, dosage, timing).

## C) API Endpoints

- **POST /precision/scan-results**
  - Payload: `{ zone_id, timestamp, detections: [{ box: [x,y,w,h], class: "blast", confidence: 0.9 }] }`
- **POST /precision/sensor-readings**
  - Payload: `{ zone_id, soil_moisture, temperature, humidity, water_level }`
- **GET /precision/field/:id/risk-summary**
  - Returns current risk score and constituent factors.
- **GET /precision/field/:id/recommendations**
  - Returns calculated chemical/organic solutions and spray windows.
- **GET /precision/field/:id/heatmap**
  - Returns list of zones with their risk scores for visualization.

## Setup Instructions

1. **Install Dependencies:**
   `npm install` (The module uses standard express/pg libraries already in package.json)

2. **Initialize Database:**
   Run `node server/setup_precision_db.js` to create the required tables.

3. **Configuration:**
   Edit `server/config/disease_rules.js` to tune risk weights and dosage parameters.

4. **Run Demo:**
   Run `node server/demo_precision.js` to simulate a full flow (Data Ingestion -> Processing -> Output).
