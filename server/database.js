const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Connect to SQLite database
const dbPath = path.resolve(__dirname, 'agriculture.db');
// DELETE DB TO RESET SCHEMA for Dev
// if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); 

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

db.serialize(() => {
    // 1. Farms Table
    db.run(`CREATE TABLE IF NOT EXISTS farms (
        farm_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        farmer_name TEXT,
        location TEXT,
        soil_type TEXT,
        field_size REAL,
        current_crop TEXT,
        sowing_date DATE,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 2. IoT Data Table
    db.run(`CREATE TABLE IF NOT EXISTS iot_readings (
        reading_id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        soil_moisture REAL,
        water_level REAL,
        temperature REAL,
        humidity REAL,
        FOREIGN KEY(farm_id) REFERENCES farms(farm_id)
    )`);

    // 3. Drone/Disease Analysis
    // Added: confidence, annotated_image_reference
    db.run(`CREATE TABLE IF NOT EXISTS drone_analysis (
        analysis_id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER,
        disease_type TEXT,
        severity TEXT,
        image_reference TEXT,
        confidence REAL,
        annotated_image_reference TEXT,
        analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(farm_id) REFERENCES farms(farm_id)
    )`);

    // 4. Recommendations Table
    db.run(`CREATE TABLE IF NOT EXISTS recommendations (
        rec_id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        crop_suggestion TEXT,
        water_advice TEXT,
        disease_detected TEXT,
        medicine_suggestion TEXT,
        dosage TEXT,
        FOREIGN KEY(farm_id) REFERENCES farms(farm_id)
    )`);

    // 5. Knowledge Base: Crop-Soil Mapping
    db.run(`CREATE TABLE IF NOT EXISTS kb_crops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        soil_type TEXT,
        water_availability TEXT,
        recommended_crop TEXT
    )`);

    // 6. Knowledge Base: Disease-Medicine Mapping
    // Added: medicine_secondary, preventive_measures, timeline
    db.run(`CREATE TABLE IF NOT EXISTS kb_diseases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        disease_name TEXT,
        medicine TEXT,
        medicine_secondary TEXT,
        dosage TEXT,
        preventive_measures TEXT,
        timeline TEXT
    )`);

    // 7. Users Table (Authentication)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'farmer')),
        full_name TEXT,
        email TEXT,
        phone TEXT,
        gender TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 8. Medicine Prices Table (for Cost Estimation)
    db.run(`CREATE TABLE IF NOT EXISTS medicine_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicine_name TEXT NOT NULL,
        brand_name TEXT,
        unit_price REAL NOT NULL,
        unit TEXT DEFAULT 'liter',
        disease_name TEXT,
        available BOOLEAN DEFAULT 1,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 9. Orders Table (Purchase Requests)
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        order_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        farm_id INTEGER,
        medicine_name TEXT,
        quantity REAL,
        total_price REAL,
        customer_name TEXT,
        phone_number TEXT,
        address TEXT,
        state TEXT,
        district TEXT,
        pincode TEXT,
        payment_method TEXT,
        status TEXT DEFAULT 'Pending',
        order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(farm_id) REFERENCES farms(farm_id)
    )`);

    // Add missing columns to existing table
    ['customer_name', 'phone_number', 'address', 'state', 'district', 'pincode', 'payment_method'].forEach(col => {
        db.run(`ALTER TABLE orders ADD COLUMN ${col} TEXT`, (err) => { /* ignore if already exists */ });
    });

    db.run(`ALTER TABLE medicine_prices ADD COLUMN disease_name TEXT`, (err) => { /* ignore if already exists */ });

    // Seed Initial Knowledge Base Data
    const stmtCrops = db.prepare("INSERT OR IGNORE INTO kb_crops (soil_type, water_availability, recommended_crop) VALUES (?, ?, ?)");
    stmtCrops.run("fertile", "high", "BPT 5204 (Samba Masuri)");
    stmtCrops.run("fertile", "medium", "MTU 1010");
    stmtCrops.run("non-fertile", "low", "Sahbhagi Dhan");
    stmtCrops.finalize();

    const stmtDiseases = db.prepare("INSERT OR IGNORE INTO kb_diseases (disease_name, medicine, medicine_secondary, dosage, preventive_measures, timeline) VALUES (?, ?, ?, ?, ?, ?)");

    // Bacterial Leaf Blight
    stmtDiseases.run(
        "Bacterial Leaf Blight",
        "Copper Oxychloride",
        "Streptocycline",
        "500g/acre",
        "Improve drainage, avoid nitrogen overdose",
        "Spray immediately, repeat after 10 days"
    );
    // Bacterial Leaf Blight (Alias)
    stmtDiseases.run(
        "Bacterial Leaf Blight (BLB)",
        "Copper Oxychloride",
        "Streptocycline",
        "500g/acre",
        "Improve drainage, avoid nitrogen overdose",
        "Spray immediately, repeat after 10 days"
    );
    stmtDiseases.run(
        "bacterial_leaf_blight",
        "Copper Oxychloride",
        "Streptocycline",
        "500g/acre",
        "Improve drainage, avoid nitrogen overdose",
        "Spray immediately, repeat after 10 days"
    );

    // Brown Spot
    stmtDiseases.run(
        "Brown Spot",
        "Mancozeb",
        "Propiconazole",
        "2.5g/liter",
        "Use potassium fertilizer, clean field boundaries",
        "Spray at tillering stage, repeat every 15 days"
    );
    stmtDiseases.run(
        "brown_spot",
        "Mancozeb",
        "Propiconazole",
        "2.5g/liter",
        "Use potassium fertilizer, clean field boundaries",
        "Spray at tillering stage, repeat every 15 days"
    );

    // Blast
    stmtDiseases.run(
        "Blast",
        "Tricyclazole 75 WP",
        "Isoprothiolane",
        "0.6g/liter",
        "Use resistant varieties, remove infected straw",
        "Spray at early appearance, repeat if rain occurs"
    );
    stmtDiseases.run(
        "blast",
        "Tricyclazole 75 WP",
        "Isoprothiolane",
        "0.6g/liter",
        "Use resistant varieties, remove infected straw",
        "Spray at early appearance, repeat if rain occurs"
    );

    // Sheath Blight
    stmtDiseases.run(
        "Sheath Blight",
        "Hexaconazole",
        "Validamycin",
        "2ml/liter",
        "Reduce seeding rate, avoid excess urea",
        "Spray when lesions appear, check after 7 days"
    );

    // Tungro
    stmtDiseases.run(
        "Tungro",
        "Imidacloprid (for vector)",
        "Thiamethoxam",
        "0.5ml/liter",
        "Control Green Leaf Hopper vector, destroy infected plants",
        "Monitor vector population, spray weekly"
    );

    // Hispa
    stmtDiseases.run(
        "hispa",
        "Chlorpyriphos 20% EC",
        "Quinalphos 25 EC",
        "2.5ml/L",
        "Clip leaf tips of seedlings, removing eggs",
        "Spray when damage is noticed"
    );

    // Dead Heart
    stmtDiseases.run(
        "dead_heart",
        "Chlorantraniliprole 18.5% SC",
        "Cartap Hydrochloride",
        "150ml/ha",
        "Install pheromone traps",
        "Apply granules at 15 DAT"
    );

    // Downy Mildew
    stmtDiseases.run(
        "downy_mildew",
        "Metalaxyl + Mancozeb",
        "Fosetyl-Al",
        "2.5g/L",
        "Remove infected plants",
        "Spray preventively in humid weather"
    );

    stmtDiseases.finalize();

    // Seed Medicine Prices
    const stmtPrices = db.prepare("INSERT OR IGNORE INTO medicine_prices (medicine_name, brand_name, unit_price, unit) VALUES (?, ?, ?, ?)");

    // Prices in INR per liter/kg
    stmtPrices.run("Copper Oxychloride", "Blitox", 450, "kg");
    stmtPrices.run("Streptocycline", "Plantomycin", 1200, "kg");
    stmtPrices.run("Mancozeb", "Dithane M-45", 380, "kg");
    stmtPrices.run("Propiconazole", "Tilt", 1800, "liter");
    stmtPrices.run("Tricyclazole 75 WP", "Beam", 1550, "kg");
    stmtPrices.run("Isoprothiolane", "Fujione", 1650, "liter");
    stmtPrices.run("Hexaconazole", "Contaf", 1900, "liter");
    stmtPrices.run("Validamycin", "Sheathmar", 2200, "liter");
    stmtPrices.run("Imidacloprid (for vector)", "Confidor", 850, "liter");
    stmtPrices.run("Thiamethoxam", "Actara", 1100, "kg");
    stmtPrices.run("Chlorpyriphos 20% EC", "Dursban", 520, "liter");
    stmtPrices.run("Quinalphos 25 EC", "Ekalux", 480, "liter");
    stmtPrices.run("Chlorantraniliprole 18.5% SC", "Coragen", 3500, "liter");
    stmtPrices.run("Cartap Hydrochloride", "Padan", 950, "kg");
    stmtPrices.run("Metalaxyl + Mancozeb", "Ridomil Gold", 1350, "kg");
    stmtPrices.run("Fosetyl-Al", "Aliette", 1750, "kg");

    stmtPrices.finalize();
});

module.exports = db;
