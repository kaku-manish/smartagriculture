const db = require('../server/database');

setTimeout(() => {
    console.log("\n--- DATABASE DIAGNOSTIC ---");

    const tables = ['farms', 'iot_readings', 'drone_analysis', 'recommendations', 'kb_crops', 'kb_diseases'];

    tables.forEach(table => {
        db.get(`SELECT count(*) as count FROM ${table}`, (err, row) => {
            if (err) {
                console.log(`[ERROR] ${table}: ${err.message}`);
            } else {
                console.log(`[OK] Table '${table}' has ${row.count} rows.`);
            }
        });
    });

}, 1000); // Wait for DB connection
