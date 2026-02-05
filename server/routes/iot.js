const express = require('express');
const router = express.Router();
const db = require('../database');

// POST /iot/reading
router.post('/reading', (req, res) => {
    const { farm_id, soil_moisture, water_level, temperature, humidity } = req.body;

    if (!farm_id) {
        return res.status(400).json({ error: 'farm_id is required' });
    }

    const sql = `INSERT INTO iot_readings (farm_id, soil_moisture, water_level, temperature, humidity) 
                 VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [farm_id, soil_moisture, water_level, temperature, humidity], function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Failed to insert data' });
        }
        res.json({
            message: 'Reading added successfully',
            reading_id: this.lastID
        });
    });
});

module.exports = router;
