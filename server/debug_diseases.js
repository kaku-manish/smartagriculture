const db = require('./server/database');
db.all('SELECT DISTINCT disease_name FROM kb_diseases', (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log('DISEASES_START');
    console.log(JSON.stringify(rows));
    console.log('DISEASES_END');
    process.exit(0);
});
