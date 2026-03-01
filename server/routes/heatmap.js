const express = require('express');
const router = express.Router();
const db = require('../database');
const heatmapEngine = require('../engine/heatmap_engine');

/**
 * GET /heatmap/field/:id
 * Generate disease heatmap for a specific field
 */
router.get('/field/:id', async (req, res) => {
    const fieldId = req.params.id;
    const cellSize = parseInt(req.query.cellSize) || 10; // meters

    try {
        // 1. Fetch field boundary
        const fieldSql = `SELECT * FROM farms WHERE farm_id = ?`;
        const field = await new Promise((resolve, reject) => {
            db.get(fieldSql, [fieldId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!field) {
            return res.status(404).json({ error: 'Field not found' });
        }

        // Parse boundary (assume stored as JSON string)
        let boundary;
        try {
            boundary = field.boundary ? JSON.parse(field.boundary) : null;
        } catch (e) {
            // If no boundary, create a default square around a center point
            // For demo: assume location field has "lat,lng"
            const [lat, lng] = (field.location || "17.385,78.486").split(',').map(Number);
            const offset = 0.001; // ~100m
            boundary = {
                polygon: [
                    [lat - offset, lng - offset],
                    [lat + offset, lng - offset],
                    [lat + offset, lng + offset],
                    [lat - offset, lng + offset],
                    [lat - offset, lng - offset]
                ]
            };
        }

        // 2. Fetch all scan points for this field
        // Join scan_batches (which have zone_id) -> zones (which have farm_id)
        const scanSql = `
            SELECT sb.timestamp, sd.class_name, sd.confidence, sd.bbox, sd.area_percent,
                   sb.metadata
            FROM scan_batches sb
            JOIN scan_detections sd ON sb.batch_id = sd.batch_id
            JOIN field_zones fz ON sb.zone_id = fz.zone_id
            WHERE fz.farm_id = ?
            ORDER BY sb.timestamp DESC
            LIMIT 1000
        `;

        const scans = await new Promise((resolve, reject) => {
            db.all(scanSql, [fieldId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        // 3. Transform scans into the format expected by heatmap engine
        // We need GPS coordinates per scan. If not stored directly, we need to extract from metadata or use zone center.
        // For now, let's assume metadata contains GPS or we use a mock approach.

        const scanPoints = [];
        const processedBatches = new Set();

        scans.forEach(scan => {
            // Parse metadata for GPS
            let gpsLat, gpsLng;
            try {
                const meta = JSON.parse(scan.metadata || '{}');
                gpsLat = meta.gps_lat;
                gpsLng = meta.gps_lng;
            } catch (e) { }

            // If no GPS in metadata, use random point within boundary (demo fallback)
            if (!gpsLat || !gpsLng) {
                const poly = boundary.polygon;
                gpsLat = poly[0][0] + Math.random() * (poly[2][0] - poly[0][0]);
                gpsLng = poly[0][1] + Math.random() * (poly[2][1] - poly[0][1]);
            }

            // Group detections by batch (timestamp uniqueness)
            const batchKey = scan.timestamp;
            if (!processedBatches.has(batchKey)) {
                scanPoints.push({
                    gps_lat: gpsLat,
                    gps_lng: gpsLng,
                    timestamp: scan.timestamp,
                    detections: []
                });
                processedBatches.add(batchKey);
            }

            // Add detection to the corresponding scan point
            const scanPoint = scanPoints.find(sp => sp.timestamp === scan.timestamp);
            if (scanPoint) {
                scanPoint.detections.push({
                    class_name: scan.class_name,
                    confidence: scan.confidence,
                    bbox_area_percent: scan.area_percent
                });
            }
        });

        // 4. Generate heatmap
        const heatmap = heatmapEngine.generateHeatmap(boundary, scanPoints, {
            cellSize: cellSize,
            tileType: 'grid'
        });

        res.json(heatmap);

    } catch (error) {
        console.error('Heatmap generation error:', error);
        res.status(500).json({ error: 'Failed to generate heatmap', details: error.message });
    }
});

/**
 * GET /heatmap/zone/:zone_id
 * Generate heatmap for a specific zone
 */
router.get('/zone/:zone_id', async (req, res) => {
    const zoneId = req.params.zone_id;

    try {
        // Fetch zone info
        const zoneSql = `SELECT * FROM field_zones WHERE zone_id = ?`;
        const zone = await new Promise((resolve) => {
            db.get(zoneSql, [zoneId], (err, row) => resolve(row));
        });

        if (!zone) {
            return res.status(404).json({ error: 'Zone not found' });
        }

        // Parse zone coordinates
        let boundary;
        try {
            boundary = JSON.parse(zone.coordinates);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid zone coordinates' });
        }

        // Fetch scans for this zone
        const scanSql = `
            SELECT sb.timestamp, sd.class_name, sd.confidence, sd.area_percent, sb.metadata
            FROM scan_batches sb
            JOIN scan_detections sd ON sb.batch_id = sd.batch_id
            WHERE sb.zone_id = ?
            ORDER BY sb.timestamp DESC
            LIMIT 500
        `;

        const scans = await new Promise((resolve) => {
            db.all(scanSql, [zoneId], (err, rows) => resolve(rows || []));
        });

        // Transform to scan points (similar logic as above)
        const scanPoints = [];
        const seen = new Set();

        scans.forEach(scan => {
            let gpsLat, gpsLng;
            try {
                const meta = JSON.parse(scan.metadata || '{}');
                gpsLat = meta.gps_lat || boundary.polygon[0][0];
                gpsLng = meta.gps_lng || boundary.polygon[0][1];
            } catch (e) {
                gpsLat = boundary.polygon[0][0];
                gpsLng = boundary.polygon[0][1];
            }

            const key = scan.timestamp;
            if (!seen.has(key)) {
                scanPoints.push({
                    gps_lat: gpsLat,
                    gps_lng: gpsLng,
                    timestamp: scan.timestamp,
                    detections: [{
                        class_name: scan.class_name,
                        confidence: scan.confidence,
                        bbox_area_percent: scan.area_percent
                    }]
                });
                seen.add(key);
            }
        });

        const heatmap = heatmapEngine.generateHeatmap(boundary, scanPoints, { cellSize: 5 });
        res.json(heatmap);

    } catch (error) {
        console.error('Zone heatmap error:', error);
        res.status(500).json({ error: 'Failed to generate zone heatmap' });
    }
});

module.exports = router;
