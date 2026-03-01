const express = require('express');
const router = express.Router();
const db = require('../database');
const operatorService = require('../services/operator_service');
// Note: We use the middleware from previous step if needed
const { checkPermission } = require('../middleware/permission_middleware');

/**
 * 🛠️ Operator Onboarding
 */
router.post('/onboard', async (req, res) => {
    const { user_id, service_regions, base_rate } = req.body;

    // First ensure the user exists and has 'operator' role (omitted for brevity)
    const sql = `
        INSERT INTO drone_operators (user_id, service_regions, base_rate_per_acre, kyc_status)
        VALUES (?, ?, ?, 'approved') -- Auto-approve for demo
    `;

    db.run(sql, [user_id, JSON.stringify(service_regions), base_rate || 150], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ operator_id: this.lastID, message: "Operator onboarded successfully" });
    });
});

/**
 * 📍 Nearby Search
 */
router.get('/nearby', async (req, res) => {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "Lat and Lng are required" });

    try {
        const operators = await operatorService.findNearbyOperators(parseFloat(lat), parseFloat(lng), parseFloat(radius || 50));
        res.json({ count: operators.length, operators });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * 📅 Booking Creation
 */
router.post('/bookings/create', async (req, res) => {
    const { farm_id, org_id, operator_id, scheduled_date, acres } = req.body;

    const sql = `
        INSERT INTO operator_bookings (farm_id, org_id, operator_id, scheduled_date, acres_to_scan, status)
        VALUES (?, ?, ?, ?, ?, 'assigned')
    `;

    db.run(sql, [farm_id, org_id, operator_id, scheduled_date, acres], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ booking_id: this.lastID, message: "Booking confirmed" });
    });
});

/**
 * 🏁 Status Update & Payout Trigger
 */
router.patch('/bookings/:id/status', async (req, res) => {
    const bookingId = req.params.id;
    const { status } = req.body;

    if (status === 'completed') {
        const completedAt = new Date().toISOString();
        const sql = `UPDATE operator_bookings SET status = 'completed', completed_at = ? WHERE id = ?`;

        db.run(sql, [completedAt, bookingId], async (err) => {
            if (err) return res.status(500).json({ error: err.message });

            try {
                const payout = await operatorService.createPayout(bookingId);
                res.json({ message: "Booking completed and payout generated", payout });
            } catch (payoutErr) {
                res.status(500).json({ error: "Booking updated but payout failed: " + payoutErr.message });
            }
        });
    } else {
        db.run("UPDATE operator_bookings SET status = ? WHERE id = ?", [status, bookingId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Status updated" });
        });
    }
});

/**
 * 💰 Payouts Dashboard
 */
router.get('/:id/payouts', (req, res) => {
    const operatorId = req.params.id;
    const sql = `SELECT * FROM operator_payouts WHERE operator_id = ? ORDER BY created_at DESC`;

    db.all(sql, [operatorId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;
