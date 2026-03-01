const axios = require('axios'); // simulating client
const db = require('./database');

// Configuration
const API_URL = 'http://localhost:3000/precision';

async function runDemo() {
    console.log("=== Precision Disease Management Demo ===");

    // 1. Simulate a Drone Scan (POST /scan-results)
    const scanPayload = {
        zone_id: 1, // Assumes seeded zone exists
        drone_id: "DRONE-001",
        timestamp: new Date().toISOString(),
        detections: [
            { class_name: "blast", confidence: 0.95, area_percent: 4.5, bbox: [100, 100, 50, 50] },
            { class_name: "blast", confidence: 0.88, area_percent: 3.2, bbox: [200, 150, 40, 40] },
            { class_name: "brown_spot", confidence: 0.65, area_percent: 1.0, bbox: [50, 50, 20, 20] }
        ]
    };

    console.log("\n1. Sending Drone Scan Data...");
    // We can't actually call localhost if the server isn't running in this context.
    // So we will simulate the "server-side" processing by requiring the router logic?
    // No, better to just print what WOULD happen or try to use fetch if valid.

    // Instead of making HTTP request which might fail if server not up, 
    // let's print the CURL command for the user.

    console.log(`curl -X POST ${API_URL}/scan-results -H "Content-Type: application/json" -d '${JSON.stringify(scanPayload)}'`);

    console.log("\n2. Interpreting Results (Mock Logic)");
    console.log("   - Fusing Detections: 3 detected (High Blast presence)");
    console.log("   - Fetching Weather: Temp 28C, Hum 75% (Conducive for Blast)");
    console.log("   - Fetching Soil: Moisture 55% (Moderate Stress)");
    console.log("   - Crop Stage: Flowering (Multiplier x1.8)");

    console.log("\n3. Expected Output (Risk Assessment):");
    console.log(JSON.stringify({
        risk_score: 92,
        action: "SPRAY IMMEDIATE",
        recommendation: "Tricyclazole 75 WP (0.6g/L)",
        constraints: "Wind < 15km/h, No Rain 6hrs"
    }, null, 2));

    console.log("\n=== End Demo ===");
}

runDemo();
