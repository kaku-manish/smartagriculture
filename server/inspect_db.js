const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'agriculture.db');
const db = new sqlite3.Database(dbPath);

console.log('--- DATABASE TABLES ---');
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(tables.map(t => t.name).join(', '));
    console.log('\n--- SAMPLE DATA (MEDICINE PRICES) ---');
    db.all("SELECT * FROM medicine_prices LIMIT 10", (err, rows) => {
        if (err) console.error(err);
        else console.table(rows);

        console.log('\n--- SAMPLE DATA (USERS) ---');
        db.all("SELECT id, username, role, full_name, email FROM users LIMIT 5", (err, rows) => {
            if (err) console.error(err);
            else console.table(rows);

            console.log('\n--- SAMPLE DATA (FARMS) ---');
            db.all("SELECT * FROM farms LIMIT 5", (err, rows) => {
                if (err) console.error(err);
                else console.table(rows);
                db.close();
            });
        });
    });
});
