const operatorService = require('./operator_service');

console.log("🧪 Testing Operator Network Logic...");

// 1. Test Distance Calculation
const dist = operatorService.calculateDistance(17.3850, 78.4867, 17.4000, 78.5000);
console.log(`- Haversine Distance (approx Hyderabad locations): ${dist.toFixed(2)} km`);

// 2. Test Payout Logic
const mockBooking = {
    acres_to_scan: 10,
    scheduled_date: '2026-02-20T10:00:00Z',
    completed_at: '2026-02-20T15:00:00Z' // Same day
};
const mockOperator = { base_rate_per_acre: 150 };

const payoutSameDay = operatorService.calculatePayout(mockBooking, mockOperator);
console.log("- Payout (Same Day Bonus):", payoutSameDay);

const mockBookingLate = {
    acres_to_scan: 10,
    scheduled_date: '2026-02-20T10:00:00Z',
    completed_at: '2026-02-22T10:00:00Z' // 2 days late
};
const payoutLate = operatorService.calculatePayout(mockBookingLate, mockOperator);
console.log("- Payout (Late Penalty):", payoutLate);

console.log("✅ Logic validation complete.");
