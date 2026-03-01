const db = require('./database');
db.all("SELECT * FROM disease_risk_assessments", [], (err, rows) => {
    if (err) console.error(err);
    console.log(rows);
});
