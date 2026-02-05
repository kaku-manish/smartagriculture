const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'agriculture.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- Latest Report Data ---");
    db.all("SELECT report_id, report_data, title FROM reports ORDER BY report_id DESC LIMIT 1", [], (err, rows) => {
        if (err) console.error(err);
        else {
            console.log(JSON.stringify(rows, null, 2));
        }
    });
});
setTimeout(() => db.close(), 1000);
