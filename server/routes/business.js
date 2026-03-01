const express = require('express');
const router = express.Router();
const db = require('../database');
const billingService = require('../services/billing_service');
const { checkPermission } = require('../middleware/permission_middleware');

// Note: In a full app, req.user is populated by a JWT verification middleware.
// For this demo/architecture, we assume it's present.

/**
 * 🏢 Organizations CRUD
 */
router.get('/orgs', checkPermission(['super_admin']), (req, res) => {
    db.all("SELECT o.*, p.name as plan_name FROM organizations o JOIN subscription_plans p ON o.plan_id = p.id", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/orgs', checkPermission(['super_admin']), (req, res) => {
    const { name, plan_id } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const sql = `INSERT INTO organizations (name, slug, plan_id) VALUES (?, ?, ?)`;
    db.run(sql, [name, slug, plan_id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: "Organization created successfully" });
    });
});

/**
 * 🛸 Scan Management (Workflow)
 */
router.post('/scans/schedule', checkPermission(['org_admin', 'operator']), async (req, res) => {
    const { field_id, scheduled_date } = req.body;
    const org_id = req.user.org_id;

    // Audit log
    await billingService.logAudit(req, 'SCHEDULE_SCAN', 'field', field_id, `Scheduled for ${scheduled_date}`);

    const sql = `INSERT INTO scans (org_id, field_id, scheduled_date, status) VALUES (?, ?, ?, 'scheduled')`;
    db.run(sql, [org_id, field_id, scheduled_date], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ scan_id: this.lastID, status: 'scheduled' });
    });
});

router.post('/scans/upload', checkPermission(['operator']), async (req, res) => {
    const { scan_id, acres_covered, result_json } = req.body;
    const org_id = req.user.org_id;

    // Usage check
    const canScan = await billingService.canScan(org_id, acres_covered);
    if (!canScan) {
        return res.status(402).json({ error: "Storage/Acre limit reached for your plan." });
    }

    const sql = `UPDATE scans SET status = 'completed', acres_covered = ?, result_json = ?, operator_id = ? WHERE id = ? AND org_id = ?`;
    db.all(sql, [acres_covered, result_json, req.user.id, scan_id, org_id], async (err) => {
        if (err) return res.status(500).json({ error: err.message });

        await billingService.logAudit(req, 'UPLOAD_SCAN', 'scan', scan_id, `Covered ${acres_covered} acres`);
        res.json({ message: "Scan results uploaded and usage updated." });
    });
});

/**
 * 💳 Billing & Usage
 */
router.get('/billing/usage', checkPermission(['org_admin']), async (req, res) => {
    try {
        const usage = await billingService.getUsage(req.user.org_id);
        const plan = await billingService.getOrgPlan(req.user.org_id);
        res.json({
            usage: usage,
            plan: plan,
            remaining: (plan.acre_limit - usage.total_acres)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * 📜 Audit Logs
 */
router.get('/audit', checkPermission(['super_admin', 'org_admin']), (req, res) => {
    let sql = "SELECT * FROM audit_logs";
    let params = [];

    if (req.user.role !== 'super_admin') {
        sql += " WHERE org_id = ?";
        params.push(req.user.org_id);
    }

    sql += " ORDER BY timestamp DESC LIMIT 100";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;
