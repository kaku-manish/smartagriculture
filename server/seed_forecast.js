const db = require('./database');

async function seed() {
    console.log("🌱 Seeding historical data for ALL farmers to ensure demo works...");

    // 1. Get all farmer IDs correctly
    const farmers = await query(`
        SELECT u.id as user_id, f.farm_id 
        FROM users u 
        LEFT JOIN farms f ON u.id = f.user_id 
        WHERE u.role = 'farmer'
    `);

    if (farmers.length === 0) {
        console.log("❌ No farmers found in DB. Please register at least one farmer first.");
        process.exit(0);
    }

    for (const farmer of farmers) {
        // Use farm_id as the surrogate zone_id for consistency
        const farmId = farmer.farm_id || farmer.user_id;
        const zoneId = farmId;
        const disease = 'Blast';

        console.log(`- Seeding for Farmer ${farmer.user_id} (Farm ID: ${farmId})`);

        // Clear existing to avoid duplicates
        await run(`DELETE FROM disease_risk_assessments WHERE zone_id = ?`, [zoneId]);
        await run(`DELETE FROM weather_logs WHERE zone_id = ?`, [zoneId]);
        await run(`DELETE FROM disease_predictions WHERE farm_id = ?`, [farmId]);
        await run(`DELETE FROM early_alerts WHERE farm_id = ?`, [farmId]);

        // 2. Generate 14 days of history
        for (let i = 14; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const timestamp = date.toISOString().replace('T', ' ').split('.')[0];
            const severity = 15 + (14 - i) * 3 + Math.random() * 5;

            const mockRec = JSON.stringify({
                action: "SPRAY",
                treatment: { product_name: "Tricyclazole 75% WP", dosage_per_acre: "120g in 200L water" },
                best_spray_window: [{ time: "06:00 AM", condition: "Excellent" }],
                constraints_analysis: "Low wind forecast for early morning."
            });

            await run(`
                INSERT INTO disease_risk_assessments 
                (zone_id, overall_risk_score, disease_pressure_score, weather_risk_score, soil_stress_score, timestamp, recommendation_json) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [zoneId, severity, severity + 5, 40, 20, timestamp, mockRec]
            );

            await run(`
                INSERT INTO weather_logs (zone_id, humidity, temp_c, rain_prob, recorded_at) 
                VALUES (?, ?, ?, ?, ?)`,
                [zoneId, 85 + Math.random() * 10, 25 + Math.random() * 5, 60, timestamp]
            );
        }

        // 3. Insert Prediction & Alert
        await run(`
            INSERT INTO disease_predictions (farm_id, zone_id, disease_class, prob_7d, prob_14d, confidence, reasons) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [farmId, zoneId, disease, 78, 92, 0.88, JSON.stringify(["Rising trend detected", "High humidity forecast", "Zone adjacency pressure"])]
        );

        await run(`
            INSERT INTO early_alerts (farm_id, zone_id, level, message, reasons) 
            VALUES (?, ?, ?, ?, ?)`,
            [farmId, zoneId, 'HIGH', `Outbreak probability (78%) predicted for this field within 7 days.`, JSON.stringify(["Humidity > 85%", "History of Blast in this zone"])]
        );
    }

    console.log("\n🚀 DONE! All farmers now have predictive data. Refresh your browser.");
    process.exit(0);
}

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

seed();
