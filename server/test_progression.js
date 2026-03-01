const geoEngine = require('./engine/geospatial_engine');

// --- Mock Data ---
const boundary = {
    polygon: [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]].map(p => [10 + p[0] * 0.01, 10 + p[1] * 0.01])
};

const now = new Date();
const d1 = new Date(now.getTime() - 2 * 86400000); // 2 days ago
const d10 = new Date(now.getTime() - 10 * 86400000); // 10 days ago

const scans = [
    // Previous Period (10 days ago) - Cluster at Bottom Left
    { gps_lat: 10.001, gps_lng: 10.001, timestamp: d10.toISOString(), detections: [{ class_name: 'blast', confidence: 0.9, bbox_area_percent: 5 }] },
    { gps_lat: 10.002, gps_lng: 10.002, timestamp: d10.toISOString(), detections: [{ class_name: 'blast', confidence: 0.9, bbox_area_percent: 5 }] },

    // Current Period (2 days ago) - Cluster Moved Top Right & Expanded
    { gps_lat: 10.005, gps_lng: 10.005, timestamp: d1.toISOString(), detections: [{ class_name: 'blast', confidence: 0.9, bbox_area_percent: 10 }] },
    { gps_lat: 10.006, gps_lng: 10.006, timestamp: d1.toISOString(), detections: [{ class_name: 'blast', confidence: 0.9, bbox_area_percent: 10 }] },
    { gps_lat: 10.007, gps_lng: 10.007, timestamp: d1.toISOString(), detections: [{ class_name: 'blast', confidence: 0.9, bbox_area_percent: 10 }] }
];

console.log("=== Progression & Spread Test ===\n");

const result = geoEngine.analyzeProgression(boundary, scans, { days: 7, disease: 'blast' });

console.log(`Status: ${result.status}`);
console.log(`Metrics:`);
console.log(`  Prev Area: ${result.metrics.previous_infected_area_m2} m²`);
console.log(`  Curr Area: ${result.metrics.current_infected_area_m2} m²`);
console.log(`  Growth: ${result.metrics.growth_pct}%`);

if (result.spread_vector) {
    const p = result.spread_vector.properties;
    console.log(`\nSpread Vector:`);
    console.log(`  Direction: ${p.direction} (${p.bearing_deg}°)`);
    console.log(`  Distance: ${p.distance_m} meters`);
} else {
    console.log("\nNo spread vector calculated (insufficient data points).");
}

console.log(`\nNew Hotspots: ${result.new_hotspots.length}`);
