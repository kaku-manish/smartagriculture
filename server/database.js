const { Pool } = require('pg');

// Use DATABASE_URL from environment variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Supabase/Heroku/Render mostly
    }
});

/**
 * PG Adapter for SQLite-style calls
 * This allows us to migrate with minimal changes to route files.
 * It automatically handles:
 * 1. Converting ? to $1, $2, etc.
 * 2. Appending RETURNING * to INSERT/UPDATE to simulate SQLite behavior (lastID)
 */
const db = {
    // Mimic db.get (return first row)
    get: async (sql, params, callback) => {
        try {
            const { rows } = await processQuery(sql, params);
            if (callback) callback(null, rows && rows.length > 0 ? rows[0] : null);
        } catch (err) {
            console.error("DB GET Error:", err);
            if (callback) callback(err);
        }
    },

    // Mimic db.all (return all rows)
    all: async (sql, params, callback) => {
        try {
            const { rows } = await processQuery(sql, params);
            if (callback) callback(null, rows);
        } catch (err) {
            console.error("DB ALL Error:", err);
            if (callback) callback(err);
        }
    },

    // Mimic db.run (insert/update/delete)
    run: async (sql, params, callback) => {
        try {
            const { rows, rowCount } = await processQuery(sql, params, true);
            if (callback) {
                // Return whichever ID column is present (id, user_id, farm_id)
                // SQLite shim usually expects this.lastID for INSERTs
                const lastID = rows && rows.length > 0 ? (rows[0].id || rows[0].user_id || rows[0].farm_id || rows[0].analysis_id || rows[0].reading_id || null) : null;
                const context = { lastID, changes: rowCount };
                callback.call(context, null);
            }
        } catch (err) {
            console.error("DB RUN Error:", err);
            if (callback) callback(err);
        }
    },

    // Helper to close pool if needed
    close: () => pool.end()
};

/**
 * Helper to execute SQL with PG
 * Handles parameter conversion (? -> $n) and RETURNING clause
 */
async function processQuery(sql, params = [], isMutation = false) {
    let cleanSql = sql.trim();

    // 1. Convert ? -> $1, $2, ...
    let paramCount = 0;
    cleanSql = cleanSql.replace(/\?/g, () => {
        paramCount++;
        return `$${paramCount}`;
    });

    // 2. For mutations (INSERT/UPDATE), append RETURNING * if not present
    // This allows us to capture the ID of the new/updated row
    if (isMutation) {
        const upperSql = cleanSql.toUpperCase();
        if ((upperSql.startsWith('INSERT') || upperSql.startsWith('UPDATE')) && !upperSql.includes('RETURNING')) {
            cleanSql += ' RETURNING *';
        }
    }

    // 3. Execute
    const result = await pool.query(cleanSql, params);
    return result;
}

module.exports = db;
