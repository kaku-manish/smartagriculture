require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Supabase Configuration — use Service Role Key for migration (bypasses Row Level Security)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vlemszsihrzrmkjhdesv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env file!');
    console.error('   This key is required to bypass Row Level Security during migration.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
    console.log('🚀 Starting Agriculture Data Migration to Supabase...\n');
    console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
    console.log(`🗄️  Local DB: ${dbPath}\n`);

    const migrationOrder = [
        // Independent tables first (no foreign keys)
        { table: 'subscription_plans', pkey: 'id' },
        { table: 'kb_diseases', pkey: 'id' },
        { table: 'medicine_prices', pkey: 'id' },
        // Tables with foreign keys
        { table: 'organizations', pkey: 'id' },
        { table: 'users', pkey: 'id' },
        { table: 'farms', pkey: 'farm_id' },
        { table: 'iot_readings', pkey: 'reading_id' },
        { table: 'drone_analysis', pkey: 'analysis_id' },
        { table: 'recommendations', pkey: 'rec_id' },
        { table: 'orders', pkey: 'order_id' },
        { table: 'scans', pkey: 'id' },
        { table: 'audit_logs', pkey: 'id' },
        { table: 'invoices', pkey: 'id' },
    ];

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const { table, pkey } of migrationOrder) {
        try {
            await migrateTable(table, pkey);
            successCount++;
        } catch (err) {
            console.error(`❌ Failed to migrate ${table}:`, err.message);
            errorCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY:');
    console.log(`   ✅ Tables migrated: ${successCount}`);
    console.log(`   ❌ Tables failed:   ${errorCount}`);
    console.log('='.repeat(50));

    if (errorCount === 0) {
        console.log('\n🎉 MIGRATION COMPLETE! All data is now in Supabase cloud.');
    } else {
        console.log('\n⚠️  Migration completed with some errors. Check the logs above.');
    }
}

runMigration();
