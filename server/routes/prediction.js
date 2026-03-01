const express = require('express');
const router = express.Router();
const db = require('../database');
const engine = require('../engine/prediction_engine');
const forecastEngine = require('../engine/forecast_engine');

/**
 * GET /zone/:id/severity-forecast?days=7
 * Returns time-series forecast for zone severity
 */
router.get('/zone/:id/severity-forecast', async (req, res) => {
    const zoneId = req.params.id;
    const days = parseInt(req.query.days) || 7;

    try {
        // Fetch historical risk scores for the last 14 days
        const sql = `
            SELECT overall_risk_score as val, timestamp 
            FROM disease_risk_assessments 
            WHERE zone_id = ? 
            ORDER BY timestamp ASC 
            LIMIT 30
        `;
        const historyRows = await query(sql, [zoneId]);
        const dataPoints = historyRows.map(r => r.val);

        const result = forecastEngine.forecast(dataPoints, days);

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /predict/sync/:zone_id
 * Trigger fresh prediction for a specific zone
 */
router.post('/sync/:zone_id', async (req, res) => {
    const zoneId = req.params.zone_id;

    try {
        // 1. Fetch Data for Engine
        const historySql = `SELECT timestamp, overall_risk_score as severity_score FROM disease_risk_assessments WHERE zone_id = ? ORDER BY timestamp DESC LIMIT 10`;
        const weatherSql = `SELECT humidity, temp_c as temp_avg, rain_prob FROM weather_logs WHERE zone_id = ? ORDER BY recorded_at DESC LIMIT 24`;
        const zoneSql = `SELECT farm_id, crop_stage FROM field_zones WHERE zone_id = ?`;

        const history = await query(historySql, [zoneId]);
        const weatherRows = await query(weatherSql, [zoneId]);
        const zone = await get(zoneSql, [zoneId]);

        if (!zone) return res.status(404).json({ error: "Zone not found" });

        // Aggregate weather for forecast simulation (simplified)
        const avgWeather = weatherRows.length > 0 ? {
            humidity_avg: weatherRows.reduce((a, b) => a + b.humidity, 0) / weatherRows.length,
            temp_avg: weatherRows.reduce((a, b) => a + b.temp_avg, 0) / weatherRows.length,
            rain_prob: weatherRows[0].rain_prob // Latest
        } : { humidity_avg: 70, temp_avg: 28, rain_prob: 0 };

        // 2. Run Engine
        const prediction = await engine.predict(history, { moisture_current: 35 }, avgWeather, zone.crop_stage);

        // 3. Save Prediction
        const saveSql = `INSERT INTO disease_predictions (farm_id, zone_id, disease_class, prob_7d, prob_14d, confidence, reasons) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.run(saveSql, [zone.farm_id, zoneId, 'blast', prediction.prob_7d, prediction.prob_14d, prediction.confidence, JSON.stringify(prediction.reasons)], async function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // 4. Generate Alert if probability is high
            if (prediction.prob_7d > 50) {
                const alertSql = `INSERT INTO early_alerts (farm_id, zone_id, level, message, reasons) VALUES (?, ?, ?, ?, ?)`;
                const msg = `High outbreak probability (${prediction.prob_7d}%) predicted for Zone ${zoneId} within 7 days.`;
                db.run(alertSql, [zone.farm_id, zoneId, prediction.level, msg, JSON.stringify(prediction.reasons)]);
            }

            res.json({ success: true, prediction });
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /field/:id/alerts
 */
router.get('/field/:id/alerts', (req, res) => {
    const farmId = req.params.id;
    const sql = `SELECT * FROM early_alerts WHERE farm_id = ? ORDER BY timestamp DESC LIMIT 20`;
    db.all(sql, [farmId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

/**
 * GET /zone/:id/predictions
 */
router.get('/zone/:id/predictions', (req, res) => {
    const zoneId = req.params.id;
    const sql = `SELECT * FROM disease_predictions WHERE zone_id = ? ORDER BY timestamp DESC LIMIT 1`;
    db.get(sql, [zoneId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) row.reasons = JSON.parse(row.reasons || '[]');
        res.json(row || null);
    });
});

// Helper wraps
function query(sql, params) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function get(sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

module.exports = router;
