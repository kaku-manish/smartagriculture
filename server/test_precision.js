const engine = require('./engine/precision_engine.js');
const assert = require('assert');

console.log("Running Precision Module Unit Tests...");

async function testRiskScoring() {
    console.log("Test 1: Risk Scoring Logic");

    const mockDetections = [
        { class_name: 'blast', confidence: 0.9, area_percent: 5.0, bbox: [0, 0, 100, 100] },
        { class_name: 'blast', confidence: 0.8, area_percent: 2.0, bbox: [0, 0, 50, 50] }
    ];

    // Scan Data with Image Area
    const mockScan = {
        detections: mockDetections,
        image_area_px: 10000 // Small image for high percentage
    };

    const mockWeather = {
        temp_c: 28, // Optimal (+30)
        humidity: 85, // High (+30) 
        rain_prob: 60, // Rain (+40) -> Total WRI likely capped at 100 or high
        wind_speed: 5
    };

    const mockSoil = {
        moisture: 25, // Very Low (+50)
        water_level: 0.5 // Very Low (+30) -> High SSI
    };

    const mockHistory = {
        last_7_days_count: 50,
        prev_7_days_count: 20 // Huge increase -> High HTF
    };

    const result = await engine.analyze(
        mockScan,
        mockWeather,
        mockSoil,
        mockHistory,
        'flowering' // Multiplier 1.8
    );

    console.log("Result:", JSON.stringify(result, null, 2));

    // Assertions
    try {
        assert(result.risk_score > 80, "Risk should be very high due to flowering + high weather risk + history");
        assert(result.recommendation.action === "CONSULT_AGRI_OFFICER" || result.recommendation.action === "SPRAY", "Action should be SPRAY/CONSULT");
        assert(result.breakdown.htf > 0, "History trend should contribute");
        console.log("✅ Test 1 Passed");
    } catch (e) {
        console.error("❌ Test 1 Failed:", e.message);
    }
}

async function testSprayConstraints() {
    console.log("\nTest 2: Spray Constraints (Windy)");

    const weatherWindy = { temp_c: 25, humidity: 60, rain_prob: 0, wind_speed: 20 }; // > 15 limit

    // checkSprayConstraints is part of the class public interface
    // Note: It returns { windows: [], analysis: ... }
    const result = engine.determineBestSprayWindow(weatherWindy);

    try {
        // If windy, we expect no safe windows or warnings in analysis
        console.log("Windy Analysis:", JSON.stringify(result));

        // My logic for determineBestSprayWindow returns a fallback message if no windows
        assert(result.windows[0].includes("No safe window") || result.windows.length === 0, "Should have no safe windows due to wind");
        console.log("✅ Test 2 Passed");
    } catch (e) {
        console.error("❌ Test 2 Failed:", e.message);
    }
}

async function runTests() {
    await testRiskScoring();
    await testSprayConstraints();
}

runTests();
