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
        file_path TEXT,
        card_path TEXT,
        status TEXT DEFAULT 'Ready'
    )`, (err) => {
        if (err) console.error("Error creating reports table:", err);
        else {
            console.log("'reports' table ready.");
            // Migration for existing columns
            db.run(`ALTER TABLE reports ADD COLUMN file_path TEXT`, () => { });
            db.run(`ALTER TABLE reports ADD COLUMN card_path TEXT`, () => { });
        }
    });
});

setTimeout(() => db.close(), 1000);
