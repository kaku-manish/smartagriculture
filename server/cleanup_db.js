const db = require('./server/database');
const diseasesToDelete = ['bacterial_leaf_blight', 'brown_spot', 'blast', 'hispa', 'dead_heart', 'downy_mildew'];
const query = `DELETE FROM kb_diseases WHERE disease_name IN (${diseasesToDelete.map(() => '?').join(',')})`;

db.run(query, diseasesToDelete, function (err) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Successfully deleted ${this.changes} dirty duplicate records.`);
    process.exit(0);
});
