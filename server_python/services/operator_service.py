import math
import datetime
from database import db_all, db_get, db_run

class OperatorService:
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        R = 6371.0  # km
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (math.sin(d_lat / 2) * math.sin(d_lat / 2) +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(d_lon / 2) * math.sin(d_lon / 2))
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def find_nearby_operators(self, lat, lng, radius=50.0):
        sql = "SELECT * FROM drone_operators WHERE is_available = 1 AND kyc_status = 'approved'"
        operators = db_all(sql)
        results = []
        
        import random
        for op in operators:
            op_lat = op.get("last_lat")
            if op_lat is None:
                op_lat = lat + (random.random() - 0.5) * 0.1
            op_lng = op.get("last_lng")
            if op_lng is None:
                op_lng = lng + (random.random() - 0.5) * 0.1
                
            distance = self.calculate_distance(lat, lng, op_lat, op_lng)
            if distance <= radius:
                op_copy = dict(op)
                op_copy["distance"] = distance
                op_copy["opLat"] = op_lat
                op_copy["opLng"] = op_lng
                results.append(op_copy)
                
        results.sort(key=lambda x: x["distance"])
        return results

    def calculate_payout(self, booking, operator):
        base = float(booking.get("acres_to_scan", 0)) * float(operator.get("base_rate_per_acre", 0))
        bonus = 0.0
        penalty = 0.0

        try:
            scheduled = datetime.datetime.fromisoformat(str(booking.get("scheduled_date", "")).replace("Z", "+00:00")).replace(tzinfo=None)
            completed = datetime.datetime.fromisoformat(str(booking.get("completed_at", "")).replace("Z", "+00:00")).replace(tzinfo=None)
            
            if scheduled.date() == completed.date():
                bonus = base * 0.10
                
            delay_limit = scheduled + datetime.timedelta(days=1)
            if completed > delay_limit:
                penalty = base * 0.15
        except Exception:
            pass

        return {
            "base_amount": base,
            "bonus": round(bonus),
            "penalty": round(penalty),
            "total_amount": round(base + bonus - penalty)
        }

    def create_payout(self, booking_id):
        sql = """
            SELECT b.*, o.base_rate_per_acre 
            FROM operator_bookings b
            JOIN drone_operators o ON b.operator_id = o.id
            WHERE b.id = ?
        """
        row = db_get(sql, [booking_id])
        if not row:
            raise Exception("Booking not found")

        payout = self.calculate_payout(row, {"base_rate_per_acre": row.get("base_rate_per_acre", 0)})
        
        insert_sql = """
            INSERT INTO operator_payouts (booking_id, operator_id, base_amount, bonus, penalty, total_amount)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        
        res_info = db_run(insert_sql, [
            booking_id, row.get("operator_id"), payout["base_amount"], 
            payout["bonus"], payout["penalty"], payout["total_amount"]
        ])
        
        return {
            "id": res_info["lastID"],
            **payout
        }

operator_service = OperatorService()
