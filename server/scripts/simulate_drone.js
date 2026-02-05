const http = require('http');

const FARM_ID = 1;
const INTERVAL = 15000; // 15 seconds

const DISEASES = ['Healthy', 'Brown Spot', 'Blast', 'Sheath Blight'];
const SEVERITY = ['low', 'medium', 'high'];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function sendAnalysis() {
    const disease = getRandomItem(DISEASES);
    const severity = disease === 'Healthy' ? 'N/A' : getRandomItem(SEVERITY);

    const data = JSON.stringify({
        farm_id: FARM_ID,
        disease_type: disease,
        severity: severity,
        image_reference: `drone_img_${Date.now()}.jpg`
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/drone/analysis',
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
            console.log(`[Drone] Sent: ${data} | Response: ${res.statusCode} ${responseData}`);
        });
    });

    req.on('error', (error) => {
        console.error(`[Drone] Error: ${error.message}`);
    });

    req.write(data);
    req.end();
}

console.log("Starting Drone Simulator...");
setInterval(sendAnalysis, INTERVAL);
