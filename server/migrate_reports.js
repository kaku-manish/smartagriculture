const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'agriculture.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking for 'reports' table...");

db.serialize(() => {
    // Reports Table
    db.run(`CREATE TABLE IF NOT EXISTS reports (
        report_id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER,
        title TEXT,
        type TEXT DEFAULT 'pdf',
        generated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        video_url TEXT, -- In case we want to attach the video loop later
        status TEXT DEFAULT 'Ready',
        FOREIGN KEY(farm_id) REFERENCES farms(farm_id)
    )`, (err) => {
        if (err) console.error("Error creating reports table:", err);
        else console.log("'reports' table ready.");
    });
});

setTimeout(() => db.close(), 1000);
