import logging
import datetime
from fastapi import APIRouter, Response, Depends
from pydantic import BaseModel
from typing import Optional

from database import db_run, db_all, db_get
from middleware.auth import AuthRole

router = APIRouter()
logger = logging.getLogger("agro-backend")

auth_farmer = AuthRole(required_role="farmer")
auth_admin = AuthRole(required_role="admin")

class OrderRequestRef(BaseModel):
    farm_id: int
    medicine_name: str
    quantity: str
    total_price: float
    customer_name: str
    phone_number: str
    address: str
    state: str
    district: str
    pincode: str
    payment_method: str
    user_id: Optional[int] = None

class OrderStatusUpdate(BaseModel):
    status: str

@router.post("/request")
def create_order_request(req: OrderRequestRef, response: Response, user: dict = Depends(auth_farmer)):
    user_id = user.get("id") if user else req.user_id
    if not user_id:
        logger.error("Order failed: No user identification found.")
        response.status_code = 401
        return {"error": "Unauthorized. Please log in again."}
        
    sql = """
        INSERT INTO orders (
            user_id, farm_id, medicine_name, quantity, total_price, 
            customer_name, phone_number, address, state, district, pincode, 
            payment_method
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    try:
        res_info = db_run(sql, [
            user_id, req.farm_id, req.medicine_name, req.quantity, req.total_price,
            req.customer_name, req.phone_number, req.address, req.state, req.district, req.pincode,
            req.payment_method
        ])
        response.status_code = 201
        return {
            "message": "Order request placed successfully",
            "orderId": res_info["lastID"]
        }
    except Exception as e:
        logger.error(f"Error creating order: {e}")
        response.status_code = 500
        return {"error": "Failed to place order request"}

@router.get("/my-orders")
def get_my_orders(response: Response, user: dict = Depends(auth_farmer)):
    if not user:
        response.status_code = 401
        return {"error": "Unauthorized"}
        
    user_id = user.get("id")
    sql = "SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC"
    try:
        rows = db_all(sql, [user_id])
        return rows
    except Exception as e:
        logger.error(f"Error fetching orders: {e}")
        response.status_code = 500
        return {"error": "Failed to fetch your orders"}

@router.get("/all")
def get_all_orders(response: Response, user: dict = Depends(auth_admin)):
    sql = """
        SELECT o.*, f.farmer_name, f.location
        FROM orders o
        JOIN farms f ON o.farm_id = f.farm_id
        ORDER BY o.order_date DESC
    """
    try:
        rows = db_all(sql)
        return rows
    except Exception as e:
        logger.error(f"Error fetching all orders: {e}")
        response.status_code = 500
        return {"error": "Failed to fetch orders"}

@router.put("/status/{order_id}")
def update_order_status(order_id: int, req: OrderStatusUpdate, response: Response, user: dict = Depends(auth_admin)):
    sql = "UPDATE orders SET status = ? WHERE order_id = ?"
    try:
        res_info = db_run(sql, [req.status, order_id])
        return {"message": "Order status updated", "changes": res_info["changes"]}
    except Exception as e:
        logger.error(f"Error updating order status: {e}")
        response.status_code = 500
        return {"error": "Failed to update order status"}
