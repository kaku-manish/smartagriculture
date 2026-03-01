const db = require('../database');

class OperatorService {
    /**
     * Calculate Distance between two points (Haversine)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Find Nearby Operators
     */
    async findNearbyOperators(lat, lng, radius = 50) {
        return new Promise((resolve, reject) => {
            // In SQLite, we fetch all available and filter in memory for complex math
            db.all("SELECT * FROM drone_operators WHERE is_available = 1 AND kyc_status = 'approved'", [], (err, operators) => {
                if (err) return reject(err);

                // For this demo, let's assume operators have a known current_location or region.
                // If current_location is missing, we check service_regions.
                // Since our schema is simple, let's mock some lat/lng for operators for the algorithm.
                const results = operators.map(op => {
                    // Mocking location for demo if not in DB
                    const opLat = op.last_lat || (lat + (Math.random() - 0.5) * 0.1);
                    const opLng = op.last_lng || (lng + (Math.random() - 0.5) * 0.1);
                    const distance = this.calculateDistance(lat, lng, opLat, opLng);
                    return { ...op, distance, opLat, opLng };
                }).filter(op => op.distance <= radius)
                    .sort((a, b) => a.distance - b.distance);

                resolve(results);
            });
        });
    }

    /**
     * Calculate Payout for a booking
     */
    calculatePayout(booking, operator) {
        const base = booking.acres_to_scan * operator.base_rate_per_acre;
        let bonus = 0;
        let penalty = 0;

        const scheduled = new Date(booking.scheduled_date);
        const completed = new Date(booking.completed_at);

        // Same day bonus (10%)
        if (scheduled.toDateString() === completed.toDateString()) {
            bonus = base * 0.10;
        }

        // Delay penalty (more than 24h delay)
        const delayLimit = scheduled.getTime() + (24 * 60 * 60 * 1000);
        if (completed.getTime() > delayLimit) {
            penalty = base * 0.15;
        }

        return {
            base_amount: base,
            bonus: Math.round(bonus),
            penalty: Math.round(penalty),
            total_amount: Math.round(base + bonus - penalty)
        };
    }

    /**
     * Create Payout Record
     */
    async createPayout(bookingId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT b.*, o.base_rate_per_acre 
                FROM operator_bookings b
                JOIN drone_operators o ON b.operator_id = o.id
                WHERE b.id = ?
            `;
            db.get(sql, [bookingId], (err, row) => {
                if (err || !row) return reject(err || new Error("Booking not found"));

                const payout = this.calculatePayout(row, { base_rate_per_acre: row.base_rate_per_acre });

                const insertSql = `
                    INSERT INTO operator_payouts (booking_id, operator_id, base_amount, bonus, penalty, total_amount)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                db.run(insertSql, [bookingId, row.operator_id, payout.base_amount, payout.bonus, payout.penalty, payout.total_amount], function (err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, ...payout });
                });
            });
        });
    }
}

module.exports = new OperatorService();
