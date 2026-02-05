const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'agriculture.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Add analysis_id to reports table if it doesn't exist
    db.run(`ALTER TABLE reports ADD COLUMN analysis_id INTEGER`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log("Column analysis_id already exists.");
            } else {
                console.error("Error adding column:", err);
            }
        } else {
            console.log("Successfully added analysis_id column to reports table.");
        }
    });

    // Also add report_data column to store the snapshot of recommendations/costs
    db.run(`ALTER TABLE reports ADD COLUMN report_data TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log("Column report_data already exists.");
            } else {
                console.error("Error adding column:", err);
            }
        } else {
            console.log("Successfully added report_data column to reports table.");
        }
    });
});

setTimeout(() => db.close(), 1000);
