from database import db_all, db_get, db_run

class BillingService:
    def get_usage(self, org_id):
        sql = """
            SELECT 
                SUM(acres_covered) as total_acres,
                COUNT(id) as total_scans
            FROM scans
            WHERE org_id = ? 
            AND strftime('%m-%Y', created_at) = strftime('%m-%Y', 'now')
        """
        row = db_get(sql, [org_id])
        return row or {"total_acres": 0, "total_scans": 0}

    def can_scan(self, org_id, requested_acres):
        usage = self.get_usage(org_id)
        plan = self.get_org_plan(org_id)

        current_acres = usage.get("total_acres") or 0
        acre_limit = plan.get("acre_limit") or 0
        
        return (current_acres + requested_acres) <= acre_limit

    def get_org_plan(self, org_id):
        sql = """
            SELECT p.* 
            FROM subscription_plans p
            JOIN organizations o ON o.plan_id = p.id
            WHERE o.id = ?
        """
        return db_get(sql, [org_id])

    def log_audit(self, req, action, entity_type, entity_id, details=''):
        sql = """
            INSERT INTO audit_logs (org_id, user_id, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        # simplified mock as we are extracting from routes where auth happens
        # standard is to pass user dictionary instead, but fallback logic mirrors js here.
        user = getattr(req, 'user', None) or {"id": 0, "org_id": 0}
        
        try:
            db_run(sql, [user.get("org_id", 0), user.get("id", 0), action, entity_type, entity_id, details])
        except Exception:
            pass

billing_service = BillingService()
