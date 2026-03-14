import logging
import sqlite3
from pathlib import Path

from database import db_run

logger = logging.getLogger("agro-backend")
logging.basicConfig(level=logging.INFO, format="%(message)s")

def migrate():
    logger.info("🛠️ Starting Full Database Migration...")

    tables = [
        # Migration V2: Business Architecture
        """CREATE TABLE IF NOT EXISTS subscription_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT UNIQUE,
            acre_limit INTEGER,
            price REAL,
            overage_rate REAL
        )""",
        """CREATE TABLE IF NOT EXISTS organizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT UNIQUE,
            plan_id INTEGER,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(plan_id) REFERENCES subscription_plans(id)
        )""",
        """CREATE TABLE IF NOT EXISTS scans (
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
        )""",
        """CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id INTEGER,
            user_id INTEGER,
            action TEXT,
            entity_type TEXT,
            entity_id INTEGER,
            details TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )""",
        """CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id INTEGER,
            amount REAL,
            status TEXT DEFAULT 'pending',
            billing_period TEXT,
            pdf_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""",

        # Migration: Drone Operator Network
        """CREATE TABLE IF NOT EXISTS drone_operators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            kyc_status TEXT DEFAULT 'pending',
            service_regions TEXT,
            base_rate_per_acre REAL DEFAULT 150,
            experience_scans INTEGER DEFAULT 0,
            rating REAL DEFAULT 5.0,
            is_available BOOLEAN DEFAULT 1,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )""",
        """CREATE TABLE IF NOT EXISTS operator_bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id INTEGER,
            farm_id INTEGER,
            operator_id INTEGER,
            status TEXT DEFAULT 'pending',
            requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            scheduled_date DATETIME,
            completed_at DATETIME,
            acres_to_scan REAL,
            lat REAL,
            lng REAL,
            price_quote REAL,
            FOREIGN KEY(operator_id) REFERENCES drone_operators(id)
        )""",
        """CREATE TABLE IF NOT EXISTS operator_payouts (
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
        )"""
    ]

    for sql in tables:
        try:
            db_run(sql)
        except Exception as e:
            logger.error(f"Error creating table: {e}")

    logger.info("✅ New tables created.")

    alter_commands = [
        "ALTER TABLE users ADD COLUMN org_id INTEGER",
        "ALTER TABLE farms ADD COLUMN org_id INTEGER"
    ]

    for sql in alter_commands:
        try:
            db_run(sql)
        except Exception as e:
            if "duplicate column" not in str(e).lower() and "already exists" not in str(e).lower():
                logger.warning(f"⚠️ Note: {e}")

    seed_plans = """
        INSERT OR IGNORE INTO subscription_plans (name, slug, acre_limit, price, overage_rate)
        VALUES 
        ('Basic', 'basic', 50, 2000, 50),
        ('Pro', 'pro', 200, 5000, 40),
        ('Enterprise', 'enterprise', 999999, 15000, 0)
    """
    try:
        db_run(seed_plans)
    except Exception as e:
        logger.warning(f"Seed script warn: {e}")

    logger.info("🚀 Full Database Migration Successful!")

if __name__ == "__main__":
    migrate()
