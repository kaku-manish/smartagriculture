const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'agriculture.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- Farms ---");
    db.all("SELECT * FROM farms", [], (err, rows) => {
        console.log(JSON.stringify(rows, null, 2));
    });

    console.log("--- Drone Analysis ---");
    db.all("SELECT * FROM drone_analysis ORDER BY analysis_date DESC LIMIT 5", [], (err, rows) => {
        console.log(JSON.stringify(rows, null, 2));
    });
});
setTimeout(() => db.close(), 2000);
