const heatmapEngine = require('./engine/heatmap_engine');
const fs = require('fs');

console.log("=== Heatmap Engine Test ===\n");

// Load sample data
const sampleData = JSON.parse(fs.readFileSync('./server/sample_heatmap_data.json', 'utf-8'));

const heatmap = heatmapEngine.generateHeatmap(
    sampleData.field_boundary,
    sampleData.scan_points,
    { cellSize: 10, tileType: 'grid' }
);

console.log(`Generated ${heatmap.features.length} tiles\n`);

// Show high-risk tiles
const highRisk = heatmap.features.filter(f => f.properties.score >= 40);
console.log(`High-risk tiles (score >= 40): ${highRisk.length}`);

highRisk.forEach(feature => {
    const p = feature.properties;
    console.log(`  Tile ${p.tile_id}: Score=${p.score}, Disease=${p.disease}, Severity=${p.severity}, Zone=${p.zone_id || 'N/A'}`);
});

// Save output
fs.writeFileSync('./server/heatmap_output.geojson', JSON.stringify(heatmap, null, 2));
console.log("\n✅ Heatmap saved to: server/heatmap_output.geojson");
console.log("   You can visualize this file at: https://geojson.io");
