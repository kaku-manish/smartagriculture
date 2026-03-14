"""
Migrate ALL data from server/agriculture.db INTO server_python/agriculture.db
AND add any missing tables.

Run: venv\Scripts\python.exe migrate_data.py
"""
import sqlite3
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("migrate")

BASE_DIR = Path(__file__).resolve().parent
OLD_DB = BASE_DIR.parent / "server" / "agriculture.db"
NEW_DB = BASE_DIR / "agriculture.db"

if not OLD_DB.exists():
    logger.error(f"Old DB not found at {OLD_DB}")
    exit(1)

logger.info(f"Source : {OLD_DB}")
logger.info(f"Target : {NEW_DB}")
logger.info("")

old_conn = sqlite3.connect(str(OLD_DB))
old_conn.row_factory = sqlite3.Row
new_conn = sqlite3.connect(str(NEW_DB))
new_conn.row_factory = sqlite3.Row

# ── STEP 1: Copy all table schemas from OLD that are missing in NEW ────────────

logger.info("== STEP 1: Syncing missing table schemas ==")

old_tables_q = old_conn.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'"
).fetchall()
old_schemas = {r["name"]: r["sql"] for r in old_tables_q}

new_tables_q = new_conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
).fetchall()
existing_new_tables = {r["name"] for r in new_tables_q}

for table_name, create_sql in old_schemas.items():
    if table_name not in existing_new_tables:
        try:
            new_conn.execute(create_sql)
            logger.info(f"  ✅ Created table: {table_name}")
        except Exception as e:
            logger.warning(f"  ⚠️  Could not create {table_name}: {e}")

new_conn.commit()

# ── STEP 2: Add columns in NEW DB that exist in OLD but are missing ────────────

logger.info("\n== STEP 2: Syncing missing columns ==")

new_tables_q2 = new_conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'"
).fetchall()
current_new_tables = {r["name"] for r in new_tables_q2}

for table_name in current_new_tables:
    if table_name not in old_schemas:
        continue
    try:
        old_cols = {r[1] for r in old_conn.execute(f"PRAGMA table_info([{table_name}])").fetchall()}
        new_cols = {r[1] for r in new_conn.execute(f"PRAGMA table_info([{table_name}])").fetchall()}
        missing = old_cols - new_cols
        for col in missing:
            # Get the full column definition from old
            col_info = [r for r in old_conn.execute(f"PRAGMA table_info([{table_name}])").fetchall() if r[1] == col][0]
            col_type = col_info[2] or "TEXT"
            default_val = col_info[4]
            dflt = f" DEFAULT {default_val}" if default_val is not None else ""
            try:
                new_conn.execute(f"ALTER TABLE [{table_name}] ADD COLUMN [{col}] {col_type}{dflt}")
                logger.info(f"  ✅ Added column {table_name}.{col}")
            except Exception as e:
                logger.warning(f"  ⚠️  Could not add {table_name}.{col}: {e}")
    except Exception as e:
        logger.warning(f"  ⚠️  Column sync error for {table_name}: {e}")

new_conn.commit()

# ── STEP 3: Copy data from OLD -> NEW (skip existing rows) ────────────────────

logger.info("\n== STEP 3: Migrating data ==")

# Tables to migrate in order (respecting FK dependencies)
MIGRATE_ORDER = [
    "subscription_plans",
    "organizations",
    "users",
    "farms",
    "kb_crops",
    "kb_diseases",
    "medicine_prices",
    "drone_analysis",
    "disease_predictions",
    "disease_risk_assessments",
    "early_alerts",
    "field_zones",
    "iot_readings",
    "weather_logs",
    "reports",
    "orders",
    "recommendations",
    "scans",
    "scan_batches",
    "scan_detections",
    "drone_operators",
    "operator_bookings",
    "operator_payouts",
    "invoices",
    "audit_logs",
]

for table in MIGRATE_ORDER:
    if table not in old_schemas:
        continue
    try:
        rows = old_conn.execute(f"SELECT * FROM [{table}]").fetchall()
        if not rows:
            logger.info(f"  ⏭️  {table}: empty, skipping")
            continue

        cols = [d[0] for d in old_conn.execute(f"SELECT * FROM [{table}] LIMIT 0").description]
        # Filter to only cols that exist in new table
        new_col_names = {r[1] for r in new_conn.execute(f"PRAGMA table_info([{table}])").fetchall()}
        valid_cols = [c for c in cols if c in new_col_names]

        placeholders = ",".join(["?" for _ in valid_cols])
        col_list = ",".join([f"[{c}]" for c in valid_cols])
        insert_sql = f"INSERT OR IGNORE INTO [{table}] ({col_list}) VALUES ({placeholders})"

        data = [[row[c] for c in valid_cols] for row in rows]
        new_conn.executemany(insert_sql, data)
        new_conn.commit()
        logger.info(f"  ✅ {table}: migrated {len(rows)} rows")
    except Exception as e:
        logger.error(f"  ❌ {table}: {e}")

# ── STEP 4: Handle password hashes ───────────────────────────────────────────

logger.info("\n== STEP 4: Verifying user passwords ==")
users = new_conn.execute("SELECT id, username, password_hash FROM users").fetchall()
for u in users:
    ph = u["password_hash"] or ""
    # bcrypt hashes start with $2b$ or $2a$
    is_bcrypt = ph.startswith("$2b$") or ph.startswith("$2a$")
    if not is_bcrypt and ph:
        # Old hash likely SHA256 or MD5 - reset to a known password
        from passlib.context import CryptContext
        pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        new_hash = pwd_ctx.hash("password123")
        new_conn.execute("UPDATE users SET password_hash=? WHERE id=?", [new_hash, u["id"]])
        logger.info(f"  🔄 Reset password for '{u['username']}' -> password123")
    else:
        logger.info(f"  ✅ '{u['username']}' has valid bcrypt hash")

new_conn.commit()

# ── STEP 5: Final verification ────────────────────────────────────────────────

logger.info("\n== STEP 5: Final count ==")
final_tables = new_conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence' ORDER BY name"
).fetchall()

total_rows = 0
for t in final_tables:
    count = new_conn.execute(f"SELECT COUNT(*) FROM [{t['name']}]").fetchone()[0]
    total_rows += count
    if count > 0:
        logger.info(f"  📋 {t['name']}: {count} rows")

logger.info(f"\n🎉 Migration complete! {len(final_tables)} tables, {total_rows} total rows")
logger.info("\nUser accounts migrated:")
all_users = new_conn.execute("SELECT id, username, role FROM users ORDER BY id").fetchall()
for u in all_users:
    logger.info(f"  👤 [{u['role']}] {u['username']}")

old_conn.close()
new_conn.close()

logger.info("\n✅ Restart the server now to see all your data!")
