import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB = BASE_DIR / "agriculture.db"
conn = sqlite3.connect(str(DB))
conn.row_factory = sqlite3.Row

total = conn.execute("SELECT COUNT(*) FROM medicine_prices").fetchone()[0]
print("Total medicine rows:", total)

dups = conn.execute("""
    SELECT medicine_name, brand_name, COUNT(*) as cnt
    FROM medicine_prices
    GROUP BY medicine_name, brand_name
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 30
""").fetchall()
print("Groups with duplicates:", len(dups))
for d in dups:
    print(" ", d['medicine_name'], "/", d['brand_name'], "=", d['cnt'], "copies")

uniq = conn.execute("SELECT COUNT(*) FROM (SELECT DISTINCT medicine_name, brand_name FROM medicine_prices)").fetchone()[0]
print("Unique name+brand:", uniq)

print("\nMedicine disease_name values:")
med_diseases = conn.execute("SELECT DISTINCT disease_name FROM medicine_prices ORDER BY disease_name").fetchall()
for r in med_diseases:
    print(" ", r['disease_name'])

print("\nKB diseases coverage:")
try:
    kb = conn.execute("SELECT DISTINCT disease_name FROM kb_diseases ORDER BY disease_name").fetchall()
    for d in kb:
        n = d['disease_name']
        cnt = conn.execute("SELECT COUNT(*) FROM medicine_prices WHERE disease_name=?", [n]).fetchone()[0]
        status = "OK" if cnt > 0 else "MISSING"
        print(f"  [{status}] {n}: {cnt} entries")
except Exception as e:
    print("kb_diseases error:", e)

conn.close()
