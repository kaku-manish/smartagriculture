import os
import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from services.cron_service import cron_service

try:
    from dotenv import load_dotenv
    # Load from server_python/.env first, then fallback to root .env
    _env_local = BASE_DIR / ".env"
    _env_root  = BASE_DIR.parent / ".env"
    if _env_local.exists():
        load_dotenv(dotenv_path=str(_env_local))
    elif _env_root.exists():
        load_dotenv(dotenv_path=str(_env_root))
    else:
        load_dotenv()  # default search
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"

# Also check the Node.js server uploads directory (sibling folder)
NODE_UPLOADS_DIR = BASE_DIR.parent / "server" / "uploads"

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("agro-backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    cron_service.start()
    yield
    cron_service.stop()

app = FastAPI(title="Agro Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://paddypulse.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Mount the Node.js server/uploads if it exists (contains the actual analyzed images)
if NODE_UPLOADS_DIR.exists():
    app.mount("/uploads", StaticFiles(directory=str(NODE_UPLOADS_DIR)), name="uploads")
    logger.info(f"📁 Serving uploads from Node.js server directory: {NODE_UPLOADS_DIR}")
else:
    app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
    logger.info(f"📁 Serving uploads from Python directory: {UPLOADS_DIR}")

@app.middleware("http")
async def debug_middleware(request: Request, call_next):
    logger.info(f"📡 [{request.method}] {request.url.path}")
    response = await call_next(request)
    return response

def _include_router(prefix: str, module_path: str):
    try:
        mod = __import__(module_path, fromlist=["router"])
        router = getattr(mod, "router")
        app.include_router(router, prefix=prefix)
        logger.info(f"✅ Mounted {module_path} at {prefix}")
    except Exception as e:
        logger.info(f"⚠️  Skipped {module_path} (not converted yet): {e}")

_include_router("/auth", "routes.auth")
_include_router("/admin", "routes.admin")
_include_router("/iot", "routes.iot")
_include_router("/drone", "routes.drone")
_include_router("/farm", "routes.farm")
_include_router("/cost", "routes.cost")
_include_router("/reports", "routes.reports")
_include_router("/orders", "routes.orders")
_include_router("/precision", "routes.precision")
_include_router("/heatmap", "routes.heatmap")
_include_router("/predict", "routes.prediction")
_include_router("/biz", "routes.business")
_include_router("/ops", "routes.operators")
_include_router("/geo", "routes.geospatial")

@app.get("/")
async def health():
    return {"status": "OK", "message": "Agro Backend is running."}

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    logger.warning(f"🚫 404: {request.method} {request.url.path}")
    return JSONResponse(
        status_code=404,
        content={"error": f"Route {request.method} {request.url.path} not found"},
    )

if __name__ == "__main__":
    import uvicorn
    # Railway passes the port dynamically via the PORT environment variable
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
