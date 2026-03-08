require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixSequences() {
    const tables = [
        { t: 'users', c: 'id' },
        { t: 'farms', c: 'farm_id' },
        { t: 'iot_readings', c: 'reading_id' },
        { t: 'drone_analysis', c: 'analysis_id' },
        { t: 'recommendations', c: 'rec_id' },
        { t: 'orders', c: 'order_id' },
        { t: 'kb_diseases', c: 'id' },
        { t: 'medicine_prices', c: 'id' },
        { t: 'subscription_plans', c: 'id' },
        { t: 'organizations', c: 'id' },
        { t: 'scans', c: 'id' },
        { t: 'audit_logs', c: 'id' },
        { t: 'invoices', c: 'id' }
    ];

    try {
        console.log("Fixing sequences...");
        for (const { t, c } of tables) {
            const sql = `SELECT setval('${t}_${c}_seq', COALESCE((SELECT MAX(${c}) FROM ${t}), 1) + 1, false)`;
            await pool.query(sql);
            console.log(`✅ Fixed sequence for ${t} (${t}_${c}_seq)`);
        }
        console.log("All done!");
    } catch (e) {
        if (e.message.includes('does not exist')) {
            console.error(`Skipping some tables that might not have sequence: ${e.message}`);
        } else {
            console.error(e);
        }
    } finally {
        pool.end();
    }
}

fixSequences();
