"""Health check endpoint."""

from fastapi import APIRouter

from config import get_settings
from database import get_db
from models import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check API health and database connectivity."""
    settings = get_settings()
    db_status = "connected"

    try:
        db = await get_db()
        await db.execute("SELECT 1")
        await db.close()
    except Exception:
        db_status = "disconnected"

    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        version="1.0.0",
        environment=settings.environment,
        database=db_status,
    )
