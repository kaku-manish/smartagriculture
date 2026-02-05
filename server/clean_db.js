const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'agriculture.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Strict Cleanup: Remove anything less than 40% confident
    db.run(`DELETE FROM drone_analysis WHERE confidence < 0.40`, function (err) {
        if (!err) console.log(`Deleted ${this.changes} low-confidence records (< 40%).`);
        else console.error("Error deleting:", err);
    });
});

setTimeout(() => {
    db.close();
}, 2000);
