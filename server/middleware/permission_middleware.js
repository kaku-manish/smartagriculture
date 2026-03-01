/**
 * RBAC Permission Middleware
 * Enforces role-based access and multi-tenant isolation.
 */

const checkPermission = (allowedRoles = [], resourceType = '') => {
    return (req, res, next) => {
        const user = req.user; // Assumes authMiddleware has run and attached user

        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Super Admin bypasses all checks
        if (user.role === 'super_admin') {
            return next();
        }

        // Check if role is allowed
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            return res.status(403).json({ error: `Forbidden: ${user.role} cannot access ${resourceType}` });
        }

        // Multi-tenant check: org_id must match unless explicitly allowed
        // For many resources, we add org_id to the query automatically in the route,
        // but here we ensure the user actually belongs to an organization.
        if (!user.org_id && user.role !== 'super_admin') {
            return res.status(403).json({ error: "User is not assigned to any organization" });
        }

        next();
    };
};

/**
 * Filter query by tenant org_id
 */
const tenantFilter = (req, sql, params = []) => {
    if (req.user.role === 'super_admin') return { sql, params };

    // Add WHERE org_id = ?
    const hasWhere = sql.toUpperCase().includes('WHERE');
    const filteredSql = hasWhere
        ? sql.replace(/WHERE/i, `WHERE org_id = ? AND `)
        : `${sql} WHERE org_id = ?`;

    return {
        sql: filteredSql,
        params: [req.user.org_id, ...params]
    };
};

module.exports = {
    checkPermission,
    tenantFilter
};
