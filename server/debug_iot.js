const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'agriculture.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- IoT Readings for Farm 14 ---");
    db.all("SELECT * FROM iot_readings WHERE farm_id = 14 ORDER BY timestamp DESC LIMIT 5", [], (err, rows) => {
        console.log(JSON.stringify(rows, null, 2));
    });
});
setTimeout(() => db.close(), 1000);
