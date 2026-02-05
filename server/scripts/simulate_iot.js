const http = require('http');

const FARM_ID = 1; // Default test farm
const INTERVAL = 5000; // 5 seconds

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function sendData() {
    const data = JSON.stringify({
        farm_id: FARM_ID,
        soil_moisture: getRandom(20, 60), // %
        water_level: getRandom(2, 15), // cm
        temperature: getRandom(25, 35), // Celsius
        humidity: getRandom(50, 80) // %
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/iot/reading',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
            console.log(`[IoT] Sent: ${data} | Response: ${res.statusCode} ${responseData}`);
        });
    });

    req.on('error', (error) => {
        console.error(`[IoT] Error: ${error.message}`);
    });

    req.write(data);
    req.end();
}

console.log("Starting IoT Simulator...");
setInterval(sendData, INTERVAL);
