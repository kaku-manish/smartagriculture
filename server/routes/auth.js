const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'paddy_secret_key';

// REGISTER
router.post('/register', async (req, res) => {
    const { username, password, full_name, email, phone, gender, field_size, org_id, org_name } = req.body;

    const role = 'farmer';

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and Password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        let target_org_id = org_id;

        // Handle new organization creation if org_name is provided
        if (org_name) {
            const slug = org_name.toLowerCase().replace(/\s+/g, '-');
            await new Promise((resolve, reject) => {
                db.run("INSERT INTO organizations (name, slug, plan_id) VALUES (?, ?, ?)", [org_name, slug, 1], function (err) {
                    if (err) reject(err);
                    else {
                        target_org_id = this.lastID;
                        resolve();
                    }
                });
            });
        }

        const sql = `INSERT INTO users (username, password_hash, role, full_name, email, phone, gender, org_id) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [username, hashedPassword, role, full_name, email, phone, gender, target_org_id], function (err) {
            if (err) {
                if (err.message?.includes('UNIQUE constraint failed') || err.message?.includes('duplicate key value')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }

            const userId = this.lastID;

            const farmSql = `INSERT INTO farms (user_id, farmer_name, location, soil_type, field_size, current_crop, org_id) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)`;

            const size = field_size ? parseFloat(field_size) : 0;
            db.run(farmSql, [userId, full_name, '', 'fertile', size, 'Paddy', target_org_id], function (err) {
                if (err) console.error('Error creating default farm:', err);

                res.status(201).json({
                    message: 'User registered successfully',
                    userId: userId,
                    orgId: target_org_id
                });
            });
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// LOGIN
router.post('/login', (req, res) => {
    const { username, password, role } = req.body;

    const sql = `SELECT * FROM users WHERE username = ?`;

    db.get(sql, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        if (role && user.role !== role) {
            return res.status(401).json({ error: `User is not an ${role}` });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        // Generate JWT Token with ORG_ID
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, org_id: user.org_id },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                org_id: user.org_id
            }
        });
    });
});
// UPDATE USER PROFILE
router.put('/update-profile', (req, res) => {
    console.log("Received update-profile request:", req.body);
    const { userId, full_name, phone, location, field_size } = req.body;

    if (!userId) {
        console.error("Update failed: Missing userId");
        return res.status(400).json({ error: 'User ID is required' });
    }

    const updateUserSql = `UPDATE users SET full_name = ?, phone = ? WHERE id = ?`;
    const updateFarmSql = `UPDATE farms SET farmer_name = ?, location = ?, field_size = ? WHERE user_id = ?`;

    // Validation / Sanitization
    const safe_size = (field_size !== '' && field_size !== null && !isNaN(field_size)) ? parseFloat(field_size) : 0;
    const safe_location = location || '';
    const safe_phone = phone || '';
    const safe_name = full_name || '';

    // Execute updates sequentially
    db.run(updateUserSql, [safe_name, safe_phone, userId], function (err) {
        if (err) {
            console.error("Error updating user table:", err.message);
            return res.status(500).json({ error: 'Failed to update user details' });
        }

        db.run(updateFarmSql, [safe_name, safe_location, safe_size, userId], function (err) {
            if (err) {
                console.error("Error updating farms table:", err.message);
                return res.status(500).json({ error: 'Failed to update farm details' });
            }

            console.log(`Profile updated for user ${userId}. Changes: ${this.changes}`);
            res.json({ message: 'Profile updated successfully' });
        });
    });
});

module.exports = router;
