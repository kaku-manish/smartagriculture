const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /reports/:farmId - Fetch reports for a specific farm (User Panel)
router.get('/:farmId', (req, res) => {
    const farmId = req.params.farmId;
    db.all("SELECT * FROM reports WHERE farm_id = ? ORDER BY generated_date DESC", [farmId], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to fetch reports" });
        }
        res.json({ reports: rows });
    });
});

// POST /reports/create - Create/Send a new report (Admin Panel)
router.post('/create', (req, res) => {
    const { farm_id, title, type, analysis_id, report_data } = req.body;

    const sql = `INSERT INTO reports (farm_id, title, type, status, analysis_id, report_data) VALUES (?, ?, ?, 'Ready', ?, ?)`;

    console.log("Creating report with data:", JSON.stringify(report_data));

    db.run(sql, [
        farm_id,
        title || 'Drone Analysis Report',
        type || 'pdf',
        analysis_id || null,
        report_data ? JSON.stringify(report_data) : null
    ], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to send report" });
        }
        res.json({ message: "Report generated and sent successfully", report_id: this.lastID });
    });
});

module.exports = router;
