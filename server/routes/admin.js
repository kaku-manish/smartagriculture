const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/authMiddleware');

// 🔒 GET /admin/farmers (ADMIN ONLY)
router.get('/farmers', auth("admin"), (req, res) => {
    const sql = `
        SELECT 
            u.id as user_id, 
            u.full_name, 
            u.username, 
            u.email, 
            u.phone,
            u.created_at,
            f.farm_id,
            f.location,
            f.soil_type,
            f.field_size,
            f.current_crop
        FROM users u
        LEFT JOIN farms f ON u.id = f.user_id
        WHERE u.role = 'farmer'
        ORDER BY u.created_at DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching farmers:", err.message);
            return res.status(500).json({ error: "Failed to fetch farmers list" });
        }
        res.json(rows);
    });
});

// 🔒 GET /admin/drone-analysis (ADMIN ONLY)
router.get('/drone-analysis', auth("admin"), (req, res) => {
    const sql = `
        SELECT 
            da.*, 
            f.farmer_name,
            f.location
        FROM drone_analysis da
        JOIN farms f ON da.farm_id = f.farm_id
        ORDER BY da.analysis_date DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching drone analysis:", err.message);
            return res.status(500).json({ error: "Failed to fetch drone analysis records" });
        }
        res.json(rows);
    });
});

module.exports = router;
