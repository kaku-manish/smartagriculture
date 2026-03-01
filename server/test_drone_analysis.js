const db = require('./database');
const farm_id = 20;
db.get("SELECT * FROM drone_analysis WHERE farm_id = ?", [farm_id], (err, row) => {
    if (err) console.error(err);
    console.log(row);
});
