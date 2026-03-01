const db = require('../database');

/**
 * Migration V2: Business Layer
 * - Adds Organizations
 * - Adds Subscription Plans
 * - Adds Usage Tracking
 * - Adds Audit Logs
 * - Updates Users and Farms with org_id
 */

async function migrate() {
    console.log("🛠️ Starting Business Architecture Migration...");

    const tables = [
        // 1. Subscription Plans
        `CREATE TABLE IF NOT EXISTS subscription_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT UNIQUE,
            acre_limit INTEGER,
            price REAL,
            overage_rate REAL
        )`,

        // 2. Organizations
        `CREATE TABLE IF NOT EXISTS organizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT UNIQUE,
            plan_id INTEGER,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(plan_id) REFERENCES subscription_plans(id)
        )`,

        // 3. Scans & Usage
        `CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id INTEGER,
            field_id INTEGER,
            operator_id INTEGER,
            status TEXT DEFAULT 'scheduled',
            scheduled_date DATETIME,
            acres_covered REAL,
            result_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(org_id) REFERENCES organizations(id)
        )`,

        // 4. Audit Logs
        `CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id INTEGER,
            user_id INTEGER,
            action TEXT,
            entity_type TEXT,
            entity_id INTEGER,
            details TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // 5. Invoices
        `CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id INTEGER,
            amount REAL,
            status TEXT DEFAULT 'pending',
            billing_period TEXT,
            pdf_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

    console.log("✅ New tables created.");

    // Add org_id to existing tables if missing
    const alterCommands = [
        "ALTER TABLE users ADD COLUMN org_id INTEGER",
        "ALTER TABLE farms ADD COLUMN org_id INTEGER"
    ];

    for (const sql of alterCommands) {
        try {
            await new Promise((resolve, reject) => {
                db.run(sql, [], (err) => {
                    // Ignore error if column already exists
                    if (err && (err.message.includes('duplicate column') || err.message.includes('already exists'))) {
                        resolve();
                    } else if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (e) {
            console.log(`⚠️ Note: ${e.message}`);
        }
    }

    // Seed default plans
    const seedPlans = `
        INSERT OR IGNORE INTO subscription_plans (name, slug, acre_limit, price, overage_rate)
        VALUES 
        ('Basic', 'basic', 50, 2000, 50),
        ('Pro', 'pro', 200, 5000, 40),
        ('Enterprise', 'enterprise', 999999, 15000, 0)
    `;
    db.run(seedPlans, []);

    console.log("🚀 Migration V2 successful!");
}

if (require.main === module) {
    migrate().then(() => process.exit(0)).catch(err => {
        console.error("❌ Migration failed:", err.message);
        process.exit(1);
    });
}

module.exports = migrate;
