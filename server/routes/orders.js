const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/authMiddleware');

// POST /orders/request - Create a new order request (Farmer)
router.post('/request', auth('farmer'), (req, res) => {
    const {
        farm_id, medicine_name, quantity, total_price,
        customer_name, phone_number, address, state, district, pincode,
        payment_method
    } = req.body;

    // Defensive check for user session with fallback to body for transition
    const user_id = req.user?.id || req.body.user_id;

    if (!user_id) {
        console.error("Order failed: No user identification found.");
        return res.status(401).json({ error: "Unauthorized. Please log in again." });
    }

    const sql = `
        INSERT INTO orders (
            user_id, farm_id, medicine_name, quantity, total_price, 
            customer_name, phone_number, address, state, district, pincode, 
            payment_method
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        user_id, farm_id, medicine_name, quantity, total_price,
        customer_name, phone_number, address, state, district, pincode,
        payment_method
    ], function (err) {
        if (err) {
            console.error("Error creating order:", err.message);
            return res.status(500).json({ error: "Failed to place order request" });
        }
        res.status(201).json({
            message: "Order request placed successfully",
            orderId: this.lastID
        });
    });
});

// GET /orders/my-orders - Get orders for the logged-in farmer
router.get('/my-orders', auth('farmer'), (req, res) => {
    const user_id = req.user.id;

    const sql = `
        SELECT * FROM orders 
        WHERE user_id = ? 
        ORDER BY order_date DESC
    `;

    db.all(sql, [user_id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Failed to fetch your orders" });
        }
        res.json(rows);
    });
});

// GET /orders/all - Get all orders (Admin)
router.get('/all', auth('admin'), (req, res) => {
    const sql = `
        SELECT o.*, f.farmer_name, f.location
        FROM orders o
        JOIN farms f ON o.farm_id = f.farm_id
        ORDER BY o.order_date DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Failed to fetch orders" });
        }
        res.json(rows);
    });
});

// PUT /orders/status/:orderId - Update order status (Admin)
router.put('/status/:orderId', auth('admin'), (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    const sql = `UPDATE orders SET status = ? WHERE order_id = ?`;

    db.run(sql, [status, orderId], function (err) {
        if (err) {
            return res.status(500).json({ error: "Failed to update order status" });
        }
        res.json({ message: "Order status updated", changes: this.changes });
    });
});

module.exports = router;
