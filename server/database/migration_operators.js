const db = require('../database');

/**
 * Migration: Drone Operator Network
 */
async function migrateOperatrs() {
    console.log("🛸 Starting Drone Operator Network Migration...");

    const tables = [
        // 1. Operators Profile
        `CREATE TABLE IF NOT EXISTS drone_operators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            kyc_status TEXT DEFAULT 'pending',
            service_regions TEXT, -- JSON array of mandals/villages
            base_rate_per_acre REAL DEFAULT 150,
            experience_scans INTEGER DEFAULT 0,
            rating REAL DEFAULT 5.0,
            is_available BOOLEAN DEFAULT 1,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`,

        // 2. Bookings (Extends or replaces scan scheduling)
        `CREATE TABLE IF NOT EXISTS operator_bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id INTEGER,
            farm_id INTEGER,
            operator_id INTEGER,
            status TEXT DEFAULT 'pending', -- pending, assigned, in_progress, completed, cancelled
            requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            scheduled_date DATETIME,
            completed_at DATETIME,
            acres_to_scan REAL,
            lat REAL,
            lng REAL,
            price_quote REAL,
            FOREIGN KEY(operator_id) REFERENCES drone_operators(id)
        )`,

        // 3. Payouts
        `CREATE TABLE IF NOT EXISTS operator_payouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER,
            operator_id INTEGER,
            base_amount REAL,
            bonus REAL DEFAULT 0,
            penalty REAL DEFAULT 0,
            total_amount REAL,
            payment_status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(booking_id) REFERENCES operator_bookings(id)
        )`
    ];

    for (const sql of tables) {
        await new Promise((resolve, reject) => {
            db.run(sql, [], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    console.log("✅ Operator tables created.");
}

if (require.main === module) {
    migrateOperatrs().then(() => process.exit(0)).catch(err => {
        console.error("❌ Migration failed:", err.message);
        process.exit(1);
    });
}

module.exports = migrateOperatrs;
