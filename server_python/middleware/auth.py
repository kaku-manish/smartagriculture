import os
import jwt
import logging
from fastapi import Request, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("agro-backend")
SECRET_KEY = os.getenv("JWT_SECRET", "paddy_secret_key")

security = HTTPBearer(auto_error=False)

class AuthRole:
    def __init__(self, required_role: str = None):
        self.required_role = required_role

    async def __call__(self, request: Request, creds: HTTPAuthorizationCredentials = Security(security)):
        user = None
        if creds and creds.credentials:
            try:
                decoded = jwt.decode(creds.credentials, SECRET_KEY, algorithms=["HS256"])
                user = decoded
            except Exception:
                logger.warning("Invalid token provided, but continuing due to bypass mode")
                
        # DEVELOPMENT BYPASS:
        if not user and request.headers.get("x-user-id"):
            try:
                user = {"id": int(request.headers.get("x-user-id")), "role": self.required_role}
            except ValueError:
                pass
            
        request.state.user = user
        return user
