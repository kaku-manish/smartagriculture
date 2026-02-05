const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// 1. Configuration
const DB_PATH = path.resolve(__dirname, 'agriculture.db');
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123'; // Default password
const ADMIN_EMAIL = 'admin@smartagri.com';
const ADMIN_NAME = 'System Administrator';

console.log(`\n🌱 Smart Agri - Admin Account Creator`);
console.log(`=======================================`);
console.log(`Target Database: ${DB_PATH}`);
console.log(`Creating Admin User: ${ADMIN_USER}`);

// 2. Connect to Database
const db = new sqlite3.Database(DB_PATH, async (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to database successfully.');

    try {
        // 3. Hash Password
        console.log('🔒 Hashing password...');
        const hashedPassword = await bcrypt.hash(ADMIN_PASS, 10);

        // 4. Insert Admin User
        const sql = `INSERT INTO users (username, password_hash, role, full_name, email, phone, gender) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [ADMIN_USER, hashedPassword, 'admin', ADMIN_NAME, ADMIN_EMAIL, '0000000000', 'Male'], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    console.log('⚠️  Admin account already exists. Skipping creation.');
                } else {
                    console.error('❌ Database error:', err.message);
                }
            } else {
                console.log(`\n✅ Admin account created successfully!`);
                console.log(`---------------------------------------`);
                console.log(`🆔 User ID: ${this.lastID}`);
                console.log(`👤 Username: ${ADMIN_USER}`);
                console.log(`🔑 Password: ${ADMIN_PASS}`);
                console.log(`---------------------------------------`);
                console.log(`⚠️  Please login and change your password immediately.`);
            }

            // Close connection
            db.close();
        });

    } catch (hashError) {
        console.error('❌ Hashing error:', hashError);
        db.close();
    }
});
