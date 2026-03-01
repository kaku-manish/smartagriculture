const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 1. Detect environment
const DATABASE_URL = process.env.DATABASE_URL;
const isCloud = !!DATABASE_URL;

let pool;
let sqliteDb;

if (isCloud) {
    console.log('📡 Database: Using Cloud PostgreSQL (Supabase)');
    pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        family: 4
    });
} else {
    console.log('🏠 Database: Using Local SQLite (agriculture.db)');
    const dbPath = path.resolve(__dirname, 'agriculture.db');
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) console.error('SQLite connection error:', err.message);
    });
}

/**
 * Unified Database Interface
 * Matches SQLite3's API but works for both PG and SQLite
 */
const db = {
    // Mimic db.get (return first row)
    get: (sql, params, callback) => {
        if (isCloud) {
            processQueryPG(sql, params)
                .then(res => callback(null, res.rows[0] || null))
                .catch(err => {
                    console.error("PG GET Error:", err);
                    callback(err);
                });
        } else {
            sqliteDb.get(sql, params, callback);
        }
    },

    // Mimic db.all (return all rows)
    all: (sql, params, callback) => {
        if (isCloud) {
            processQueryPG(sql, params)
                .then(res => callback(null, res.rows))
                .catch(err => {
                    console.error("PG ALL Error:", err);
                    callback(err);
                });
        } else {
            sqliteDb.all(sql, params, callback);
        }
    },

    // Mimic db.run (insert/update/delete)
    run: function (sql, params, callback) {
        if (isCloud) {
            processQueryPG(sql, params, true)
                .then(res => {
                    const row = res.rows[0] || {};
                    const lastID = row.id || row.user_id || row.farm_id || row.analysis_id || row.reading_id || null;
                    const result = { lastID, changes: res.rowCount };
                    if (callback) callback.call(result, null);
                })
                .catch(err => {
                    console.error("PG RUN Error:", err);
                    if (callback) callback(err);
                });
        } else {
            // Note: In SQLite mode, we use a standard function to preserve 'this' context for lastID
            sqliteDb.run(sql, params, callback);
        }
    },

    close: () => {
        if (isCloud) pool.end();
        else sqliteDb.close();
    }
};

/**
 * PG Helper for SQL & Parameter conversion
 */
async function processQueryPG(sql, params = [], isMutation = false) {
    let cleanSql = sql.trim();

    // Convert ? -> $n
    let count = 0;
    cleanSql = cleanSql.replace(/\?/g, () => `$${++count}`);

    // Append RETURNING for mutations
    if (isMutation) {
        const up = cleanSql.toUpperCase();
        if ((up.startsWith('INSERT') || up.startsWith('UPDATE')) && !up.includes('RETURNING')) {
            cleanSql += ' RETURNING *';
        }
    }

    return await pool.query(cleanSql, params);
}

module.exports = db;
