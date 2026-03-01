const express = require('express');
const router = express.Router();
const db = require('../database');
const geoEngine = require('../engine/geospatial_engine');

// Helper to fetch field stats
async function getFieldBoundary(fieldId) {
    return new Promise((resolve) => {
        const sql = `SELECT * FROM farms WHERE farm_id = ?`;
        db.get(sql, [fieldId], (err, row) => {
            if (!row || !row.boundary) {
                // Return mock boundary if missing (17.385, 78.486)
                resolve({
                    polygon: [
                        [17.385, 78.486], [17.387, 78.486],
                        [17.387, 78.489], [17.385, 78.489], [17.385, 78.486]
                    ]
                });
            } else {
                resolve(JSON.parse(row.boundary));
            }
        });
    });
}

// Helper to fetch scans with optional filtering
async function getProjectedScans(fieldId, days = 30) {
    const sql = `
        SELECT sb.timestamp, sd.class_name, sd.confidence, sd.bbox, sd.area_percent, sb.metadata
        FROM scan_batches sb
        JOIN scan_detections sd ON sb.batch_id = sd.batch_id
        JOIN field_zones fz ON sb.zone_id = fz.zone_id
        WHERE fz.farm_id = ? 
          AND sb.timestamp >= date('now', '-${days} days')
        ORDER BY sb.timestamp ASC
    `;

    return new Promise((resolve, reject) => {
        db.all(sql, [fieldId], (err, rows) => {
            if (err) return reject(err);

            // Map rows to normalized engine input
            const points = rows.map(r => {
                let lat, lng;
                try {
                    const meta = JSON.parse(r.metadata || '{}');
                    lat = meta.gps_lat || 17.386;
                    lng = meta.gps_lng || 78.487;
                } catch (e) { lat = 17.386; lng = 78.487; }

                return {
                    gps_lat: lat,
                    gps_lng: lng,
                    timestamp: r.timestamp,
                    detections: [{
                        class_name: r.class_name,
                        confidence: r.confidence,
                        bbox_area_percent: r.area_percent
                    }]
                };
            });
            resolve(points);
        });
    });
}

/**
 * GET /geo/field/:id/heatmap
 */
router.get('/field/:id/heatmap', async (req, res) => {
    try {
        const boundary = await getFieldBoundary(req.params.id);
        const scans = await getProjectedScans(req.params.id, 90);

        const result = geoEngine.generateHeatmap(boundary, scans, { cellSize: 10 });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /geo/field/:id/spread
 * Returns vectors showing disease movement over time
 */
router.get('/field/:id/spread', async (req, res) => {
    try {
        const scans = await getProjectedScans(req.params.id, 14); // Last 14 days
        const disease = req.query.disease || null;

        const spreadCtx = geoEngine.calculateSpread(scans, disease);

        res.json({
            success: true,
            analysis: spreadCtx || "Not enough data points to calculate spread"
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /geo/field/:id/zones
 */
router.get('/field/:id/zones', async (req, res) => {
    try {
        const boundary = await getFieldBoundary(req.params.id);
        const scans = await getProjectedScans(req.params.id, 90);

        const result = geoEngine.generateHeatmap(boundary, scans, { cellSize: 10 });
        res.json(result.zones);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /geo/field/:id/summary
 */
router.get('/field/:id/summary', async (req, res) => {
    try {
        const boundary = await getFieldBoundary(req.params.id);
        const scans = await getProjectedScans(req.params.id, 90);

        // Generate just the necessary tile data for stats
        const tiles = geoEngine.createTiles(boundary, 10);
        const tilesWithData = geoEngine.assignScansToTiles(tiles, scans);
        const scoredTiles = geoEngine.computeTileScores(tilesWithData);

        const stats = geoEngine.generateStats(scoredTiles);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /geo/field/:id/progression
 * Compares current vs previous time window (default 7 days)
 * Query: ?days=7&disease=blast
 */
router.get('/field/:id/progression', async (req, res) => {
    try {
        const dias = parseInt(req.query.days) || 7;
        const disease = req.query.disease || null;

        // Fetch enough history (2x window)
        const boundary = await getFieldBoundary(req.params.id);
        const scans = await getProjectedScans(req.params.id, dias * 2 + 1);

        const result = geoEngine.analyzeProgression(boundary, scans, {
            days: dias,
            disease: disease
        });

        res.json(result);

    } catch (err) {
        console.error("Progression Analysis Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
