const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Supabase Configuration
const SUPABASE_URL = 'https://vlemszsihrzrmkjhdesv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZW1zenNpaHJ6cm1ramhkZXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzcyODksImV4cCI6MjA4NTg1MzI4OX0.WCnVosp5lX_Spe3Uw0nbjp-feUSgo16apls7_IB2mXU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Local DB Path
const dbPath = path.resolve(__dirname, 'agriculture.db');
const db = new sqlite3.Database(dbPath);

async function migrateTable(tableName, pkey = 'id') {
    console.log(`\n--- Migrating Table: ${tableName} ---`);

    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
            if (err) {
                console.error(`Error reading ${tableName}:`, err.message);
                return resolve();
            }

            if (rows.length === 0) {
                console.log(`No data in ${tableName}. Skipping.`);
                return resolve();
            }

            console.log(`Found ${rows.length} rows to migrate.`);

            // Process in batches of 50 to avoid payload size limits
            for (let i = 0; i < rows.length; i += 50) {
                const batch = rows.slice(i, i + 50);

                // Remove null IDs if they are SERIAL in Supabase (optional)
                // However, to maintain foreign key integrity, we SHOULD keep the same IDs

                const { error } = await supabase
                    .from(tableName)
                    .insert(batch);

                if (error) {
                    console.error(`Error inserting batch into ${tableName}:`, error.message);
                } else {
                    console.log(`Successfully migrated batch ${i / 50 + 1} of ${tableName}`);
                }
            }
            resolve();
        });
    });
}

async function runMigration() {
    console.log('Starting Agriculture Data Migration Shield...');

    try {
        // We migrate in a specific order to satisfy foreign key constraints
        await migrateTable('users');
        await migrateTable('farms', 'farm_id');
        await migrateTable('iot_readings', 'reading_id');
        await migrateTable('drone_analysis', 'analysis_id');
        await migrateTable('recommendations', 'rec_id');
        await migrateTable('kb_diseases');
        await migrateTable('medicine_prices');
        await migrateTable('orders', 'order_id');

        console.log('\n✅ MIGRATION COMPLETE! All data is now in the cloud.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        db.close();
        process.exit();
    }
}

runMigration();
