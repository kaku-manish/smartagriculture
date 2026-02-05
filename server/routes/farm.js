const express = require('express');
const router = express.Router();
const db = require('../database');
const { generateRecommendation } = require('../engine/recommender');

// GET /farm/:id/status
router.get('/:id/status', (req, res) => {
    const farmId = req.params.id;

    // We need to fetch: Farm Details, Latest IoT, Latest Drone, KnowledgeBase
    const queries = {
        farm: "SELECT * FROM farms WHERE farm_id = ?",
        iot: "SELECT * FROM iot_readings WHERE farm_id = ? ORDER BY timestamp DESC LIMIT 1",
        drone: "SELECT * FROM drone_analysis WHERE farm_id = ? ORDER BY analysis_date DESC LIMIT 1",
        kbCrops: "SELECT * FROM kb_crops",
        kbDiseases: "SELECT * FROM kb_diseases"
    };

    db.get(queries.farm, [farmId], (err, farm) => {
        if (err || !farm) return res.status(404).json({ error: 'Farm not found' });

        db.get(queries.iot, [farmId], (err, iot) => {
            db.get(queries.drone, [farmId], (err, drone) => {
                db.all(queries.kbCrops, [], (err, kbCrops) => {
                    db.all(queries.kbDiseases, [], (err, kbDiseases) => {

                        // Generate Recommendation
                        const rec = generateRecommendation(farm, iot, drone, kbCrops, kbDiseases);

                        res.json({
                            farm,
                            latest_iot: iot || null,
                            latest_drone: drone || null,
                            recommendation: rec
                        });

                    });
                });
            });
        });
    });
});

// GET /farm/user/:userId/status
router.get('/user/:userId/status', (req, res) => {
    const userId = req.params.userId;

    // Fetch farm associated with user
    db.get("SELECT * FROM farms WHERE user_id = ?", [userId], (err, farm) => {
        if (err || !farm) {
            // If no farm found (shouldn't happen for new users), return empty/defaults
            return res.status(404).json({ error: 'Farm not found for this user' });
        }

        const farmId = farm.farm_id;
        const queries = {
            iot: "SELECT * FROM iot_readings WHERE farm_id = ? ORDER BY timestamp DESC LIMIT 1",
            drone: "SELECT * FROM drone_analysis WHERE farm_id = ? ORDER BY analysis_date DESC LIMIT 1",
            kbCrops: "SELECT * FROM kb_crops",
            kbDiseases: "SELECT * FROM kb_diseases"
        };

        db.get(queries.iot, [farmId], (err, iot) => {
            db.get(queries.drone, [farmId], (err, drone) => {
                db.all(queries.kbCrops, [], (err, kbCrops) => {
                    db.all(queries.kbDiseases, [], (err, kbDiseases) => {

                        // Generate Recommendation
                        const rec = generateRecommendation(farm, iot, drone, kbCrops, kbDiseases);

                        res.json({
                            farm,
                            latest_iot: iot || null,
                            latest_drone: drone || null,
                            recommendation: rec
                        });

                    });
                });
            });
        });
    });
});

module.exports = router;
