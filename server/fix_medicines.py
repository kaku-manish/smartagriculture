"""
Fix medicine_prices table:
1. Remove all duplicates - keep only 1 row per (medicine_name, brand_name) combination
2. Add missing disease-medicine mappings for all paddy diseases
3. Set disease_name properly for all medicines

Run: venv\Scripts\python.exe fix_medicines.py
"""
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB = BASE_DIR / "agriculture.db"
conn = sqlite3.connect(str(DB))
conn.row_factory = sqlite3.Row

print("=== STEP 1: Remove duplicates ===")
before = conn.execute("SELECT COUNT(*) FROM medicine_prices").fetchone()[0]
print(f"Before: {before} rows")

# Keep only the row with the lowest id for each (medicine_name, brand_name) group
conn.execute("""
    DELETE FROM medicine_prices
    WHERE id NOT IN (
        SELECT MIN(id)
        FROM medicine_prices
        GROUP BY medicine_name, brand_name
    )
""")
conn.commit()
after = conn.execute("SELECT COUNT(*) FROM medicine_prices").fetchone()[0]
print(f"After:  {after} rows (removed {before - after} duplicates)")

print("\n=== STEP 2: Clear stale disease_name values ===")
# Show current medicines
meds = conn.execute("SELECT id, medicine_name, brand_name, unit_price, unit FROM medicine_prices ORDER BY medicine_name").fetchall()
print(f"Unique medicines kept: {len(meds)}")
for m in meds:
    print(f"  [{m['id']}] {m['medicine_name']} / {m['brand_name']} - Rs.{m['unit_price']}/{m['unit']}")

print("\n=== STEP 3: Adding comprehensive medicine catalog for all diseases ===")

# Complete medicine catalog - each disease gets its proper medicines
disease_medicines = [
    # ── Blast (Rice Blast / Magnaporthe oryzae) ───────────────────────────────
    ("Tricyclazole 75 WP",     "Beam",             75.0,  "gm",  "blast"),
    ("Isoprothiolane",         "Fujione",          220.0, "litre","blast"),
    ("Propiconazole",          "Tilt",             550.0, "litre","blast"),
    ("Hexaconazole",           "Contaf",           480.0, "litre","blast"),
    ("Carbendazim 50 WP",      "Bavistin",         280.0, "kg",  "blast"),

    # ── Brown Spot (Bipolaris oryzae) ─────────────────────────────────────────
    ("Mancozeb",               "Dithane M-45",     180.0, "kg",  "brown_spot"),
    ("Propiconazole",          "Tilt",             550.0, "litre","brown_spot"),
    ("Iprodione",              "Rovral",           900.0, "kg",  "brown_spot"),
    ("Copper Oxychloride",     "Blitox",           320.0, "kg",  "brown_spot"),
    ("Hexaconazole",           "Contaf",           480.0, "litre","brown_spot"),

    # ── Bacterial Leaf Blight (Xanthomonas oryzae) ───────────────────────────
    ("Streptocycline",         "Plantomycin",      180.0, "gm",  "Bacterial Leaf Blight"),
    ("Copper Oxychloride",     "Blitox",           320.0, "kg",  "Bacterial Leaf Blight"),
    ("Kasugamycin",            "Kasu-B",           650.0, "litre","Bacterial Leaf Blight"),
    ("Bronopol",               "Agrocinon",        420.0, "gm",  "Bacterial Leaf Blight"),

    # ── Sheath Blight (Rhizoctonia solani) ────────────────────────────────────
    ("Validamycin",            "Sheathmar",        230.0, "litre","Sheath Blight"),
    ("Hexaconazole",           "Contaf",           480.0, "litre","Sheath Blight"),
    ("Propiconazole",          "Tilt",             550.0, "litre","Sheath Blight"),
    ("Carbendazim + Mancozeb", "Companion",        310.0, "kg",  "Sheath Blight"),
    ("Tricyclazole 75 WP",     "Beam",              75.0, "gm",  "Sheath Blight"),

    # ── Tungro (Rice Tungro Virus) ────────────────────────────────────────────
    ("Imidacloprid (for vector)","Confidor",        750.0, "litre","Tungro"),
    ("Thiamethoxam",           "Actara",           900.0, "kg",  "Tungro"),
    ("Chlorpyriphos 20% EC",   "Dursban",          280.0, "litre","Tungro"),
    ("Carbofuran 3G",          "Furadan",          220.0, "kg",  "Tungro"),

    # ── Hispa (Dicladispa armigera) ───────────────────────────────────────────
    ("Chlorantraniliprole 18.5% SC","Coragen",     1800.0,"litre","hispa"),
    ("Quinalphos 25 EC",       "Ekalux",           350.0, "litre","hispa"),
    ("Cartap Hydrochloride",   "Padan",             800.0,"kg",  "hispa"),
    ("Lambda-cyhalothrin",     "Karate",           380.0, "litre","hispa"),
    ("Chlorpyriphos 20% EC",   "Dursban",          280.0, "litre","hispa"),

    # ── Dead Heart / Yellow Ear Head (Stem Borer) ────────────────────────────
    ("Chlorantraniliprole 18.5% SC","Coragen",     1800.0,"litre","dead_heart"),
    ("Fipronil 5% SC",         "Regent",           480.0, "litre","dead_heart"),
    ("Cartap Hydrochloride",   "Padan",             800.0,"kg",  "dead_heart"),
    ("Chlorpyriphos 20% EC",   "Dursban",          280.0, "litre","dead_heart"),
    ("Monocrotophos",          "Nuvacron",         320.0, "litre","dead_heart"),

    # ── Downy Mildew (Sclerophthora macrospora) ───────────────────────────────
    ("Metalaxyl + Mancozeb",   "Ridomil Gold",     650.0, "kg",  "downy_mildew"),
    ("Fosetyl-Al",             "Aliette",          800.0, "kg",  "downy_mildew"),
    ("Copper Oxychloride",     "Blitox",           320.0, "kg",  "downy_mildew"),
    ("Dimethomorph",           "Acrobat",          720.0, "kg",  "downy_mildew"),

    # ── Bacterial Leaf Blight (BLB variant) ──────────────────────────────────
    ("Streptocycline",         "Plantomycin",      180.0, "gm",  "Bacterial Leaf Blight (BLB)"),
    ("Copper Hydroxide",       "Kocide",           550.0, "kg",  "Bacterial Leaf Blight (BLB)"),
    ("Kasugamycin",            "Kasu-B",           650.0, "litre","Bacterial Leaf Blight (BLB)"),

    # ── General / Multi-disease treatments ────────────────────────────────────
    ("Azoxystrobin",           "Amistar",         1200.0,"litre", None),
    ("Tebuconazole",           "Folicur",          780.0, "litre", None),
    ("Neem Oil EC",            "Neemark",          180.0, "litre", None),
]

inserted = 0
updated = 0
for med_name, brand, price, unit, disease in disease_medicines:
    # Check if this medicine already exists
    existing = conn.execute(
        "SELECT id, disease_name FROM medicine_prices WHERE medicine_name=? AND brand_name=?",
        [med_name, brand]
    ).fetchone()

    if existing:
        # Update disease_name if not set or different
        if disease and (existing['disease_name'] is None or existing['disease_name'] != disease):
            conn.execute(
                "UPDATE medicine_prices SET disease_name=?, unit_price=?, unit=?, available=1 WHERE id=?",
                [disease, price, unit, existing['id']]
            )
            updated += 1
    else:
        # Insert new
        conn.execute("""
            INSERT INTO medicine_prices (medicine_name, brand_name, unit_price, unit, available, disease_name, last_updated)
            VALUES (?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
        """, [med_name, brand, price, unit, disease])
        inserted += 1

conn.commit()
print(f"  Inserted new: {inserted}")
print(f"  Updated existing: {updated}")

print("\n=== STEP 4: Final verification ===")
final_total = conn.execute("SELECT COUNT(*) FROM medicine_prices").fetchone()[0]
print(f"Total medicines in catalog: {final_total}")

print("\nDisease coverage:")
diseases_to_check = [
    "blast", "brown_spot", "Bacterial Leaf Blight", "Bacterial Leaf Blight (BLB)",
    "Sheath Blight", "Tungro", "hispa", "dead_heart", "downy_mildew"
]
for d in diseases_to_check:
    cnt = conn.execute("SELECT COUNT(*) FROM medicine_prices WHERE disease_name=?", [d]).fetchone()[0]
    status = "OK" if cnt > 0 else "MISSING"
    print(f"  [{status}] {d}: {cnt} medicines")

print("\nAll medicines in catalog:")
all_meds = conn.execute(
    "SELECT medicine_name, brand_name, unit_price, unit, disease_name FROM medicine_prices ORDER BY disease_name, medicine_name"
).fetchall()
for m in all_meds:
    print(f"  {m['medicine_name']} / {m['brand_name']} Rs.{m['unit_price']}/{m['unit']} [{m['disease_name']}]")

conn.close()
print("\nDone! Restart the server to see changes.")
