const engine = require('./engine/prediction_engine');

async function testForecasting() {
    console.log("🧪 Testing Outbreak Forecasting Engine...\n");

    // Case 1: Rising Infection + Bad Weather (High Risk)
    const historyHigh = [
        { timestamp: '2026-02-17', severity_score: 45 },
        { timestamp: '2026-02-10', severity_score: 20 }
    ];
    const sensorHigh = { moisture_current: 25 };
    const forecastHigh = { humidity_avg: 92, temp_avg: 27, rain_prob: 80 };

    const resHigh = await engine.predict(historyHigh, sensorHigh, forecastHigh, 'tillering');
    console.log("🔴 CASE: RISING OUTBREAK");
    console.log(`- Prob 7d: ${resHigh.prob_7d}%`);
    console.log(`- Prob 14d: ${resHigh.prob_14d}%`);
    console.log(`- Level: ${resHigh.level}`);
    console.log(`- Reasons: ${resHigh.reasons.join(', ')}`);
    console.log("----------------------------------\n");

    // Case 2: Stable/None + Dry Weather (Low Risk)
    const historyLow = [{ timestamp: '2026-02-17', severity_score: 5 }];
    const sensorLow = { moisture_current: 45 };
    const forecastLow = { humidity_avg: 60, temp_avg: 22, rain_prob: 5 };

    const resLow = await engine.predict(historyLow, sensorLow, forecastLow, 'maturity');
    console.log("🟢 CASE: STABLE FIELD");
    console.log(`- Prob 7d: ${resLow.prob_7d}%`);
    console.log(`- Level: ${resLow.level}`);
    console.log("----------------------------------");
}

testForecasting();
