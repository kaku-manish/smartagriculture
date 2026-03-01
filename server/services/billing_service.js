const db = require('../database');

/**
 * Billing & Usage Service
 * Tracks acre consumption and manages subscription limits.
 */
class BillingService {
    /**
     * Get usage for current billing cycle
     */
    async getUsage(orgId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    SUM(acres_covered) as total_acres,
                    COUNT(id) as total_scans
                FROM scans
                WHERE org_id = ? 
                AND strftime('%m-%Y', created_at) = strftime('%m-%Y', 'now')
            `;
            db.get(sql, [orgId], (err, row) => {
                if (err) reject(err);
                else resolve(row || { total_acres: 0, total_scans: 0 });
            });
        });
    }

    /**
     * Check if org can scan more acres
     */
    async canScan(orgId, requestedAcres) {
        const usage = await this.getUsage(orgId);
        const plan = await this.getOrgPlan(orgId);

        const currentAcres = usage.total_acres || 0;
        return (currentAcres + requestedAcres) <= (plan.acre_limit || 0);
    }

    /**
     * Get Org Plan details
     */
    async getOrgPlan(orgId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT p.* 
                FROM subscription_plans p
                JOIN organizations o ON o.plan_id = p.id
                WHERE o.id = ?
            `;
            db.get(sql, [orgId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    /**
     * Log Audit Event
     */
    async logAudit(req, action, entityType, entityId, details = '') {
        const sql = `
            INSERT INTO audit_logs (org_id, user_id, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const user = req.user || { id: 0, org_id: 0 };
        return new Promise((resolve, reject) => {
            db.run(sql, [user.org_id, user.id, action, entityType, entityId, details], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

module.exports = new BillingService();
