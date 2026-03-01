# Geo-Spatial Disease Mapping System

## 🌍 Overview
This module transforms drone detection data into actionable geospatial intelligence. It provides inputs for heatmaps, infection clustering, and disease spread analysis.

## 🏗️ Architecture
- **Engine**: `server/engine/geospatial_engine.js` (Core Tiling & Spatial Logic)
- **API**: `server/routes/geospatial.js` (REST Endpoints)
- **Visualization**: React + Leaflet (Frontend)

## 📡 API Endpoints

### 1. `GET /geo/field/:id/heatmap`
Returns GeoJSON FeatureCollections for:
- Field Grid Tiles (with scores)
- Clustered Infection Zones (Polygons)

### 2. `GET /geo/field/:id/spread`
Analyses disease movement over the last 14 days.
**Response:**
```json
{
  "vectors": [
    { "from_date": "2023-10-01", "to_date": "2023-10-02", "bearing_deg": 45, "distance_m": 12 },
    ...
  ]
}
```

### 3. `GET /geo/field/:id/progression`
Compares metrics between This Week vs Last Week.
**Response:**
```json
{
  "trend": {
    "risk_delta": 150,
    "growth_pct": 12.5
  }
}
```

## 🛠️ Setup & Migrations
The system uses the existing `scan_batches` and `scan_detections` tables but relies on `metadata` JSON field for GPS coordinates (`gps_lat`, `gps_lng`).

### DB Migration (SQL)
Ensure your `scan_batches` table has valid metadata:
```sql
UPDATE scan_batches 
SET metadata = '{"gps_lat": 17.386, "gps_lng": 78.487}' 
WHERE metadata IS NULL;
```

## 🧪 Testing
Run the demo script to populate data and check endpoints:
```bash
node server/test_heatmap.js
```

## 🎨 Frontend Implementation
Use `Leaflet` to render:
1. `L.geoJSON(data.heatmap)` -> Colored Grid
2. `L.geoJSON(data.zones)` -> Red Outlines for clusters
3. `L.polyline(vectors)` -> Arrows showing spread direction
