"""
Check what tables and data exist in server/agriculture.db (the old Node.js DB)
"""
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
old_db = BASE_DIR.parent / "server" / "agriculture.db"
new_db = BASE_DIR / "agriculture.db"

print(f"Old DB path: {old_db}")
print(f"Old DB exists: {old_db.exists()}")
print(f"Old DB size: {old_db.stat().st_size if old_db.exists() else 'N/A'} bytes\n")

if old_db.exists():
    conn = sqlite3.connect(str(old_db))
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [r[0] for r in cur.fetchall()]
    print(f"Tables in OLD DB ({len(tables)}):")
    for t in tables:
        count = conn.execute(f"SELECT COUNT(*) FROM [{t}]").fetchone()[0]
        print(f"  {t}: {count} rows")
    conn.close()

print()
print(f"New DB path: {new_db}")
print(f"New DB exists: {new_db.exists()}")
if new_db.exists():
    conn2 = sqlite3.connect(str(new_db))
    cur2 = conn2.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables2 = [r[0] for r in cur2.fetchall()]
    print(f"Tables in NEW DB ({len(tables2)}):")
    for t in tables2:
        count = conn2.execute(f"SELECT COUNT(*) FROM [{t}]").fetchone()[0]
        print(f"  {t}: {count} rows")
    conn2.close()
