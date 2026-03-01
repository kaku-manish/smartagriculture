"""
Full Database Setup Script
Run this ONCE to create all tables and seed initial data.
Usage: venv\Scripts\python.exe setup_db.py
"""
import sqlite3
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("setup_db")

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "agriculture.db"

logger.info(f"📂 Using database: {DB_PATH}")

conn = sqlite3.connect(str(DB_PATH))
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# ── CORE TABLES ──────────────────────────────────────────────────────────────

tables = [
    # 1. Users
    """CREATE TABLE IF NOT EXISTS users (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        username        TEXT UNIQUE NOT NULL,
        password_hash   TEXT NOT NULL,
        role            TEXT DEFAULT 'farmer',
        full_name       TEXT,
        email           TEXT,
        phone           TEXT,
        gender          TEXT,
        org_id          INTEGER,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",

    # 2. Farms
    """CREATE TABLE IF NOT EXISTS farms (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        farmer_name  TEXT,
        location     TEXT,
        soil_type    TEXT DEFAULT 'fertile',
        field_size   REAL DEFAULT 0,
        current_crop TEXT DEFAULT 'Paddy',
        org_id       INTEGER,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )""",

    # 3. Disease Analyses
    """CREATE TABLE IF NOT EXISTS disease_analyses (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id         INTEGER,
        user_id         INTEGER,
        disease_name    TEXT,
        severity        TEXT,
        confidence      REAL,
        affected_area   REAL,
        recommendations TEXT,
        image_path      TEXT,
        annotated_path  TEXT,
        source          TEXT DEFAULT 'drone',
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(farm_id) REFERENCES farms(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )""",

    # 4. IoT Sensor Readings
    """CREATE TABLE IF NOT EXISTS sensor_readings (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id       INTEGER,
        temperature   REAL,
        humidity      REAL,
        soil_moisture REAL,
        ph_level      REAL,
        nitrogen      REAL,
        phosphorus    REAL,
        potassium     REAL,
        recorded_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(farm_id) REFERENCES farms(id)
    )""",

    # 5. Treatment Plans
    """CREATE TABLE IF NOT EXISTS treatment_plans (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_id INTEGER,
        farm_id     INTEGER,
        plan_text   TEXT,
        chemicals   TEXT,
        cost_est    REAL,
        status      TEXT DEFAULT 'pending',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(analysis_id) REFERENCES disease_analyses(id),
        FOREIGN KEY(farm_id) REFERENCES farms(id)
    )""",

    # 6. Reports
    """CREATE TABLE IF NOT EXISTS reports (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id     INTEGER,
        user_id     INTEGER,
        report_type TEXT DEFAULT 'disease',
        pdf_path    TEXT,
        data_json   TEXT,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(farm_id) REFERENCES farms(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )""",

    # 7. Subscription Plans
    """CREATE TABLE IF NOT EXISTS subscription_plans (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT NOT NULL,
        slug         TEXT UNIQUE,
        acre_limit   INTEGER,
        price        REAL,
        overage_rate REAL
    )""",

    # 8. Organizations
    """CREATE TABLE IF NOT EXISTS organizations (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        slug       TEXT UNIQUE,
        plan_id    INTEGER,
        status     TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(plan_id) REFERENCES subscription_plans(id)
    )""",

    # 9. Scans
    """CREATE TABLE IF NOT EXISTS scans (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id         INTEGER,
        field_id       INTEGER,
        operator_id    INTEGER,
        status         TEXT DEFAULT 'scheduled',
        scheduled_date DATETIME,
        acres_covered  REAL,
        result_json    TEXT,
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(org_id) REFERENCES organizations(id)
    )""",

    # 10. Audit Logs
    """CREATE TABLE IF NOT EXISTS audit_logs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id      INTEGER,
        user_id     INTEGER,
        action      TEXT,
        entity_type TEXT,
        entity_id   INTEGER,
        details     TEXT,
        timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",

    # 11. Invoices
    """CREATE TABLE IF NOT EXISTS invoices (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id         INTEGER,
        amount         REAL,
        status         TEXT DEFAULT 'pending',
        billing_period TEXT,
        pdf_path       TEXT,
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",

    # 12. Drone Operators
    """CREATE TABLE IF NOT EXISTS drone_operators (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id          INTEGER UNIQUE,
        kyc_status       TEXT DEFAULT 'pending',
        service_regions  TEXT,
        base_rate_per_acre REAL DEFAULT 150,
        experience_scans INTEGER DEFAULT 0,
        rating           REAL DEFAULT 5.0,
        is_available     BOOLEAN DEFAULT 1,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )""",

    # 13. Operator Bookings
    """CREATE TABLE IF NOT EXISTS operator_bookings (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id         INTEGER,
        farm_id        INTEGER,
        operator_id    INTEGER,
        status         TEXT DEFAULT 'pending',
        requested_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        scheduled_date DATETIME,
        completed_at   DATETIME,
        acres_to_scan  REAL,
        lat            REAL,
        lng            REAL,
        price_quote    REAL,
        FOREIGN KEY(operator_id) REFERENCES drone_operators(id)
    )""",

    # 14. Operator Payouts
    """CREATE TABLE IF NOT EXISTS operator_payouts (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id     INTEGER,
        operator_id    INTEGER,
        base_amount    REAL,
        bonus          REAL DEFAULT 0,
        penalty        REAL DEFAULT 0,
        total_amount   REAL,
        payment_status TEXT DEFAULT 'pending',
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(booking_id) REFERENCES operator_bookings(id)
    )""",

    # 15. Cost Estimates
    """CREATE TABLE IF NOT EXISTS cost_estimates (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id      INTEGER,
        analysis_id  INTEGER,
        cost_type    TEXT,
        amount       REAL,
        currency     TEXT DEFAULT 'INR',
        notes        TEXT,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(farm_id) REFERENCES farms(id)
    )""",

    # 16. Yield Forecasts
    """CREATE TABLE IF NOT EXISTS yield_forecasts (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id         INTEGER,
        predicted_yield REAL,
        unit            TEXT DEFAULT 'kg/acre',
        season          TEXT,
        model_version   TEXT,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(farm_id) REFERENCES farms(id)
    )""",
]

logger.info("🛠️  Creating tables...")
for sql in tables:
    try:
        cur.execute(sql)
        table_name = sql.strip().split("EXISTS ")[-1].split(" ")[0]
        logger.info(f"   ✅ {table_name}")
    except Exception as e:
        logger.error(f"   ❌ Error: {e}")

conn.commit()

# ── SEED DATA ─────────────────────────────────────────────────────────────────

logger.info("\n🌱 Seeding default data...")

try:
    cur.execute("""
        INSERT OR IGNORE INTO subscription_plans (name, slug, acre_limit, price, overage_rate)
        VALUES
        ('Basic', 'basic', 50, 2000, 50),
        ('Pro', 'pro', 200, 5000, 40),
        ('Enterprise', 'enterprise', 999999, 15000, 0)
    """)
    logger.info("   ✅ Subscription plans seeded")
except Exception as e:
    logger.error(f"   ❌ Plan seed error: {e}")

# Create default admin user
import hashlib, os
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    admin_hash = pwd_context.hash("admin123")
    cur.execute("""
        INSERT OR IGNORE INTO users (username, password_hash, role, full_name, email)
        VALUES ('admin', ?, 'admin', 'System Admin', 'admin@paddypulse.com')
    """, [admin_hash])
    logger.info("   ✅ Default admin user created (username: admin, password: admin123)")
except Exception as e:
    logger.error(f"   ❌ Admin user error: {e}")

conn.commit()
conn.close()

# ── VERIFY ────────────────────────────────────────────────────────────────────

conn2 = sqlite3.connect(str(DB_PATH))
cur2 = conn2.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables_created = [r[0] for r in cur2.fetchall()]
conn2.close()

logger.info(f"\n🎉 Setup complete! {len(tables_created)} tables in database:")
for t in tables_created:
    logger.info(f"   📋 {t}")

logger.info("\n✅ You can now run the server and login!")
logger.info("   Default admin: username=admin, password=admin123")
