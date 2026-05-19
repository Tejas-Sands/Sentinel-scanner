"""User profile and usage endpoints."""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from auth import require_auth
from database import get_db
from models import UserResponse, ScanResponse, ScanSummary, Flag, Counterparty

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/user")


@router.get("/me", response_model=UserResponse)
async def get_current_user(user_id: int = Depends(require_auth)) -> UserResponse:
    """Get the current user's profile and usage data."""
    try:
        db = await get_db()
        try:
            cursor = await db.execute(
                """SELECT id, email, tier, scans_used_this_month, scans_limit, month_reset, created_at
                   FROM users WHERE id = ?""",
                (user_id,),
            )
            row = await cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="User not found")

            # Reset if new month
            current_month = datetime.now(timezone.utc).strftime("%Y-%m")
            month_reset_val = row[5] or ""
            scans_used = row[3] if row[3] is not None else 0
            scans_limit = row[4] if row[4] is not None else 10
            tier_val = row[2] or "free"

            if month_reset_val != current_month:
                await db.execute(
                    "UPDATE users SET scans_used_this_month = 0, month_reset = ? WHERE id = ?",
                    (current_month, user_id),
                )
                await db.commit()
                scans_used = 0

            created_at_val = str(row[6]) if row[6] is not None else None

            return UserResponse(
                id=row[0],
                email=row[1],
                tier=tier_val,
                scans_used_this_month=scans_used,
                scans_limit=scans_limit,
                scans_remaining=max(0, scans_limit - scans_used),
                created_at=created_at_val,
            )
        finally:
            await db.close()
    except Exception as e:
        import traceback
        logger.exception("Failed to get current user info")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch user profile internally: {str(e)}\nTraceback: {traceback.format_exc()}"
        )


@router.get("/scans")
async def get_user_scans(
    user_id: int = Depends(require_auth),
    limit: int = 20,
    offset: int = 0,
) -> dict:
    """Get the current user's recent scans."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT scan_id, address, chain, risk_score, risk_tier, flags, created_at
               FROM scans WHERE user_id = ?
               ORDER BY created_at DESC LIMIT ? OFFSET ?""",
            (user_id, min(limit, 50), offset),
        )
        rows = await cursor.fetchall()

        # Get total count
        count_cursor = await db.execute(
            "SELECT COUNT(*) FROM scans WHERE user_id = ?", (user_id,),
        )
        total = (await count_cursor.fetchone())[0]

        scans = []
        for row in rows:
            scans.append({
                "scan_id": row[0],
                "address": row[1],
                "chain": row[2],
                "risk_score": row[3],
                "risk_tier": row[4],
                "flags_count": len(json.loads(row[5])) if row[5] else 0,
                "created_at": row[6],
            })

        return {
            "scans": scans,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    finally:
        await db.close()
