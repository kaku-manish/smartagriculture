# Disease Heatmap System

## Overview
The heatmap system converts GPS-tagged drone detections into a spatial grid visualization showing disease distribution across paddy fields.

## Architecture

### 1. Backend Components

#### `heatmap_engine.js`
Core engine that:
- Grids a field polygon into cells (default 10m x 10m)
- Assigns detections to cells based on GPS coordinates
- Computes per-cell disease scores
- Clusters neighboring high-risk tiles into "infection zones"
- Outputs GeoJSON format

#### API Endpoints

**GET /heatmap/field/:id?cellSize=10**
- Generates heatmap for entire field
- Returns GeoJSON FeatureCollection

**GET /heatmap/zone/:zone_id**
- Generates heatmap for a specific zone
- Finer granularity (5m cells)

### 2. Frontend Component

**DiseaseHeatmap.jsx**
- React component using Leaflet
- Color-coded tiles (Red=Severe, Orange=Moderate, Yellow=Mild, Green=Low)
- Interactive popups showing:
  - Risk score
  - Dominant disease
  - Detection count
  - Cluster zone ID
- Real-time stats panel

## Installation

### Backend Dependencies
Already included in existing package.json

### Frontend Dependencies
```bash
cd client
npm install react-leaflet leaflet
```

## Usage

### 1. Test Heatmap Generation
```bash
node server/test_heatmap.js
```
This generates `heatmap_output.geojson` which you can visualize at https://geojson.io

### 2. API Usage Example
```javascript
// Fetch heatmap
const response = await fetch('http://localhost:3000/heatmap/field/1?cellSize=10');
const geojson = await response.json();

// geojson.features[0].properties contains:
// {
//   tile_id, score, disease, severity, 
//   last_seen, detection_count, zone_id
// }
```

### 3. React Integration
```jsx
import DiseaseHeatmap from './components/DiseaseHeatmap';

function App() {
  return <DiseaseHeatmap farmId={1} />;
}
```

## Clustering Logic

High-risk tiles (score >= 40) within 30 meters are grouped into "infection zones" with a `zone_id`. This helps farmers identify:
- Localized outbreaks
- Priority treatment areas
- Disease spread patterns

## Customization

### Adjust Cell Size
```javascript
// Smaller cells = finer detail, more computation
GET /heatmap/field/1?cellSize=5
```

### Color Thresholds
Edit `DiseaseHeatmap.jsx`:
```javascript
const getColor = (score) => {
  if (score >= 70) return '#d73027'; // Severe
  if (score >= 40) return '#fc8d59'; // Moderate
  // ... customize as needed
};
```

### Scoring Algorithm
Edit `heatmap_engine.js` `computeTileScores()`:
```javascript
const areaScore = Math.min(totalArea * 5, 100);
const densityScore = Math.min(tile.detections.length * 15, 100);
const score = (areaScore * 0.6 + densityScore * 0.4) * avgConfidence;
```

## Sample Output (GeoJSON)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[17.385, 78.486], [17.386, 78.486], ...]]
      },
      "properties": {
        "tile_id": 0,
        "score": 85,
        "disease": "blast",
        "severity": "severe",
        "last_seen": "2026-02-14T10:00:00Z",
        "detection_count": 3,
        "zone_id": 1
      }
    }
  ]
}
```

## Visualization Options

### Option 1: Leaflet (Implemented)
- Open-source
- No API keys required
- Good for internal dashboards

### Option 2: Mapbox GL
```jsx
import mapboxgl from 'mapbox-gl';

map.addSource('heatmap', { type: 'geojson', data: geojson });
map.addLayer({
  id: 'disease-heatmap',
  type: 'fill',
  source: 'heatmap',
  paint: {
    'fill-color': ['get', 'fillColor'],
    'fill-opacity': 0.6
  }
});
```

### Option 3: Google Maps
Use Data Layer API with GeoJSON import

## Performance Notes

- Fields > 100 acres: Use larger cell sizes (20m+)
- Cache heatmaps in DB to avoid regeneration
- Consider pre-computing overnight for dashboard display

## Telugu Language Support

Add translations in the popup:
```javascript
const severityTelugu = {
  'severe': 'తీవ్రమైన',
  'moderate': 'మధ్యస్థ',
  'mild': 'తేలిక'
};
```
