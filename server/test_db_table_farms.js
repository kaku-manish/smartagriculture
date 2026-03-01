const db = require('./database');
db.all("SELECT * FROM farms", [], (err, rows) => {
    if (err) console.error(err);
    console.log(rows);
});
