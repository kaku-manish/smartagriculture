const express = require('express');
const router = express.Router();
const db = require('../database');
const engine = require('../engine/precision_engine');

// POST /precision/scan-results
// Receives YOLO detections from Drone/Edge
router.post('/scan-results', async (req, res) => {
    const { zone_id, timestamp, detections, drone_id, image_area_px } = req.body;

    // 1. Validation
    if (!zone_id || !detections) {
        return res.status(400).json({ error: "Missing required fields: zone_id, detections" });
    }

    try {
        // 2. Log Batch
        const meta = JSON.stringify({ drone_id, image_area_px });
        const batchSql = `INSERT INTO scan_batches (zone_id, timestamp, metadata) VALUES (?, ?, ?)`;

        await new Promise((resolve, reject) => {
            db.run(batchSql, [zone_id, timestamp || new Date(), meta], function (err) {
                if (err) return reject(err);

                const batchId = this.lastID;

                // 3. Log Detections (Loop)
                const detectionSql = `INSERT INTO scan_detections (batch_id, class_name, confidence, bbox, area_percent)
                                      VALUES (?, ?, ?, ?, ?)`;

                detections.forEach(d => {
                    db.run(detectionSql, [
                        batchId,
                        d.class_name,
                        d.confidence,
                        JSON.stringify(d.bbox || []),
                        d.area_percent || 0
                    ]);
                });

                resolve(batchId);
            });
        });

        // 4. Input Fusion

        // A. Weather & Soil
        let weatherData = { temp_c: 28, humidity: 75, rain_prob: 20, wind_speed: 10 };
        let soilData = { moisture: 55, water_level: 5 }; // Default nominal

        try {
            const iotSql = `
                SELECT soil_moisture, x.water_level, temperature, humidity 
                FROM iot_readings x
                WHERE farm_id = (SELECT farm_id FROM field_zones WHERE zone_id = ?) 
                ORDER BY timestamp DESC LIMIT 1`;

            const iotRow = await new Promise((resolve) => db.get(iotSql, [zone_id], (err, row) => resolve(row)));

            if (iotRow) {
                soilData.moisture = iotRow.soil_moisture;
                soilData.water_level = iotRow.water_level || 5;
                if (iotRow.temperature) weatherData.temp_c = iotRow.temperature;
                if (iotRow.humidity) weatherData.humidity = iotRow.humidity;
            }
        } catch (e) { console.log("IoT Fetch Error:", e.message); }

        try {
            const wSql = `SELECT temp_c, humidity, rain_prob, wind_kph FROM weather_logs WHERE zone_id = ? ORDER BY recorded_at DESC LIMIT 1`;
            const wRow = await new Promise(resolve => db.get(wSql, [zone_id], (err, row) => resolve(row)));

            if (wRow) {
                weatherData.rain_prob = wRow.rain_prob;
                weatherData.wind_speed = wRow.wind_kph;
            }
        } catch (e) { console.log("Weather Fetch Error:", e.message); }

        // B. Crop Stage
        let cropStage = 'tillering';
        await new Promise((resolve) => {
            db.get("SELECT crop_stage FROM field_zones WHERE zone_id = ?", [zone_id], (err, row) => {
                if (row) cropStage = row.crop_stage;
                resolve();
            });
        });

        // C. History Trends (Last 7 days vs Previous 7 days)
        // Note: SQLite doesn't have interval math easily without extensions, assuming generic query or helper
        // We will perform naive date checks in JS if DB is constrained, OR simplistic logic.
        // Let's rely on detection count in scan_detections linked via batches.

        let historyData = { last_7_days_count: 0, prev_7_days_count: 0 };

        try {
            // This query counts detections for this Zone in two buckets
            // Using generic timestamp string logic for compatibility
            const now = new Date();
            const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

            const hSql = `
                SELECT 
                    SUM(CASE WHEN sb.timestamp >= ? THEN 1 ELSE 0 END) as recent,
                    SUM(CASE WHEN sb.timestamp < ? AND sb.timestamp >= ? THEN 1 ELSE 0 END) as previous
                FROM scan_detections sd
                JOIN scan_batches sb ON sd.batch_id = sb.batch_id
                WHERE sb.zone_id = ?
            `;

            const hRow = await new Promise(resolve => db.get(hSql, [d7, d7, d14, zone_id], (err, row) => resolve(row)));

            if (hRow) {
                historyData.last_7_days_count = hRow.recent || 0;
                historyData.prev_7_days_count = hRow.previous || 0;
            }
        } catch (e) { console.log("History Fetch Error:", e.message); }

        // 5. Run Engine
        const result = await engine.analyze(
            { detections, image_area_px },
            weatherData,
            soilData,
            historyData,
            cropStage
        );

        // 6. Save Outcome
        const riskSql = `INSERT INTO disease_risk_assessments 
                         (zone_id, timestamp, overall_risk_score, disease_pressure_score, weather_risk_score, soil_stress_score, recommendation_json)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const recJson = JSON.stringify(result);

        db.run(riskSql, [
            zone_id,
            new Date(),
            result.risk_score,
            result.breakdown.dss,
            result.breakdown.wri,
            result.breakdown.ssi,
            recJson
        ]);

        res.status(200).json(result);

    } catch (e) {
        console.error("Scan Error:", e);
        res.status(500).json({ error: "Processing failed" });
    }
});

// GET /precision/field/:id/risk-summary
router.get('/field/:id/risk-summary', (req, res) => {
    const zoneId = req.params.id;
    // Get latest assessment
    const sql = `SELECT * FROM disease_risk_assessments WHERE zone_id = ? ORDER BY timestamp DESC LIMIT 1`;

    db.get(sql, [zoneId], (err, row) => {
        if (err) return res.status(500).json({ error: "DB Error" });
        if (!row) return res.status(404).json({ message: "No data for this zone" });

        // Parse JSON field for client convenience
        try {
            row.recommendation_json = JSON.parse(row.recommendation_json);
        } catch (e) { }

        res.json(row);
    });
});

// GET /precision/zone/:id/recommendations
router.get('/zone/:id/recommendations', (req, res) => {
    const zoneId = req.params.id;
    const sql = `SELECT recommendation_json FROM disease_risk_assessments WHERE zone_id = ? ORDER BY timestamp DESC LIMIT 1`;

    db.get(sql, [zoneId], (err, row) => {
        if (err) return res.status(500).json({ error: "DB Error" });
        if (!row) return res.status(404).json({ message: "No recommendations found" });

        try {
            res.json(JSON.parse(row.recommendation_json));
        } catch (e) {
            res.status(500).json({ error: "Data Parse Error" });
        }
    });
});

// GET /precision/field/:farm_id/heatmap
router.get('/field/:farm_id/heatmap', (req, res) => {
    const farmId = req.params.farm_id;
    // Get all zones for this farm and their LATEST risk score
    const sql = `
        SELECT z.zone_id, z.name, z.coordinates, ra.overall_risk_score, ra.timestamp
        FROM field_zones z
        LEFT JOIN disease_risk_assessments ra ON z.zone_id = ra.zone_id
        WHERE z.farm_id = ?
        AND (ra.assessment_id IS NULL OR ra.assessment_id IN (
            SELECT MAX(assessment_id) FROM disease_risk_assessments GROUP BY zone_id
        ))
    `;

    db.all(sql, [farmId], (err, rows) => {
        if (err) return res.status(500).json({ error: "DB Error: " + err.message });
        res.json(rows);
    });
});

module.exports = router;
