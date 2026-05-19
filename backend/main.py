"""Sentinel Scanner — FastAPI application entry point."""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from secure import Secure

from config import get_settings
from database import init_db
from services.ofac import load_sanctions_set, load_mixer_set

from limiter import limiter

# Initialize Secure Headers
secure_headers = Secure.with_default_headers()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — initialize DB and load data on startup."""
    settings = get_settings()
    logger.info("Starting Sentinel Scanner (%s)", settings.environment)

    # Initialize database + seed data
    await init_db()

    # Load sanctions & mixer sets into memory
    sanctions = await load_sanctions_set()
    mixers = await load_mixer_set()
    logger.info(
        "Loaded %d sanctions addresses and %d mixer addresses",
        len(sanctions), len(mixers),
    )

    if not settings.alchemy_api_key:
        logger.warning("⚠️  ALCHEMY_API_KEY not set — scans will return empty transaction data")

    logger.info("✅ Sentinel Scanner ready on port 8000")
    yield
    logger.info("Shutting down Sentinel Scanner")


# --- Create app ---
app = FastAPI(
    title="Sentinel Scanner API",
    description="Ethereum wallet compliance scanner — paste any ETH address, get a risk report in 3 seconds.",
    version="1.0.0",
    lifespan=lifespan,
)

# --- Rate Limiter ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Security Headers Middleware ---
@app.middleware("http")
async def set_secure_headers(request: Request, call_next):
    response = await call_next(request)
    secure_headers.set_headers(response)
    return response

# --- HTTPS Redirect Middleware ---
settings = get_settings()
if not settings.is_development:
    app.add_middleware(HTTPSRedirectMiddleware)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routes ---
from routes.health import router as health_router
from routes.scan import router as scan_router
from routes.auth_routes import router as auth_router
from routes.user import router as user_router
from routes.reports import router as reports_router

API_PREFIX = "/api/v1"

app.include_router(health_router, prefix=API_PREFIX, tags=["Health"])
app.include_router(scan_router, prefix=API_PREFIX, tags=["Scanning"])
app.include_router(auth_router, prefix=API_PREFIX, tags=["Authentication"])
app.include_router(user_router, prefix=API_PREFIX, tags=["User"])
app.include_router(reports_router, prefix=API_PREFIX, tags=["Reports"])


@app.get("/")
async def root():
    """Root redirect to API docs."""
    return {
        "name": "Sentinel Scanner API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": f"{API_PREFIX}/health",
    }
