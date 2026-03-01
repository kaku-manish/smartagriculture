const db = require('./database');

async function setup() {
    console.log("Initializing Precision Disease Management Schema...");

    // 1. Field Zones (Granular management)
    const createZones = `
    CREATE TABLE IF NOT EXISTS field_zones (
        zone_id SERIAL PRIMARY KEY,
        farm_id INTEGER, 
        name TEXT,
        coordinates TEXT, -- simplified for sqlite/generic pg (store as JSON or WKT)
        crop_stage TEXT DEFAULT 'tillering', -- seedling, tillering, panicle, flowering, maturity
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    // 2. Scan Batches (A drone flight over a zone)
    const createBatches = `
    CREATE TABLE IF NOT EXISTS scan_batches (
        batch_id SERIAL PRIMARY KEY,
        zone_id INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT -- JSON string for drone info etc
    );`;

    // 3. Scan Detections (Individual YOLO boxes)
    const createDetections = `
    CREATE TABLE IF NOT EXISTS scan_detections (
        detection_id SERIAL PRIMARY KEY,
        batch_id INTEGER,
        class_name TEXT,
        confidence REAL,
        bbox TEXT, -- JSON [x,y,w,h]
        area_percent REAL
    );`;

    // 4. Weather Cache
    const createWeather = `
    CREATE TABLE IF NOT EXISTS weather_logs (
        weather_id SERIAL PRIMARY KEY,
        zone_id INTEGER,
        forecast_ts TIMESTAMP,
        temp_c REAL,
        humidity REAL,
        rain_prob REAL,
        wind_kph REAL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    // 5. Risk Assessments ( The Result )
    const createRisk = `
    CREATE TABLE IF NOT EXISTS disease_risk_assessments (
        assessment_id SERIAL PRIMARY KEY,
        zone_id INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        overall_risk_score REAL,
        disease_pressure_score REAL,
        weather_risk_score REAL,
        soil_stress_score REAL,
        recommendation_json TEXT -- JSON object with dosage, chemicals
    );`;

    // Helper to run queries sequentially
    const run = (sql) => new Promise((resolve, reject) => {
        // Adjust syntax for SQLite vs PG if necessary (SERIAL vs AUTOINCREMENT)
        // Since database.js handles connections, we rely on its 'run' method. 
        // Note: Generic SQL above uses SERIAL which writes to valid PG. 
        // For SQLite, standard types work but SERIAL might need handling if we were strictly raw SQLite.
        // But the user asked for Postgres preferred. Let's assume the wrapper or underlying DB handles it,
        // or we use standard SQL.

        // Actually, for SQLite compatibility in the same script:
        let compatSql = sql;
        if (!process.env.DATABASE_URL) {
            // Local SQLite adjustments
            compatSql = compatSql.replace(/SERIAL PRIMARY KEY/g, "INTEGER PRIMARY KEY AUTOINCREMENT");
            compatSql = compatSql.replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, "DATETIME DEFAULT CURRENT_TIMESTAMP");
        }

        db.run(compatSql, [], (err) => {
            if (err) {
                console.error("Error running SQL:", err);
                // Don't reject, just log (if table exists it might error on create if not exist logic fails or other issues)
                resolve();
            } else {
                console.log("Table Setup Complete.");
                resolve();
            }
        });
    });

    // 6. Disease Predictions
    const createPredictions = `
    CREATE TABLE IF NOT EXISTS disease_predictions (
        prediction_id SERIAL PRIMARY KEY,
        farm_id INTEGER,
        zone_id INTEGER,
        disease_class TEXT,
        prob_7d REAL,
        prob_14d REAL,
        confidence REAL,
        reasons TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    // 7. Early Warning Alerts
    const createAlerts = `
    CREATE TABLE IF NOT EXISTS early_alerts (
        alert_id SERIAL PRIMARY KEY,
        farm_id INTEGER,
        zone_id INTEGER,
        level TEXT,
        message TEXT,
        reasons TEXT,
        is_read INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    await run(createZones);
    await run(createBatches);
    await run(createDetections);
    await run(createWeather);
    await run(createRisk);
    await run(createPredictions);
    await run(createAlerts);

    console.log("Schema Initialization Finished.");

    // Seed one zone for testing
    const seedSql = `INSERT INTO field_zones (farm_id, name, crop_stage) VALUES (1, 'Zone A - North', 'flowering')`;
    await run(seedSql);
}

setup();
