"""PDF report generation and download endpoints."""

import json
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from auth import require_auth
from config import get_settings
from database import get_db
from models import ReportGenerateRequest, ReportResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports")

# Ensure reports directory exists
REPORTS_DIR = Path(__file__).parent.parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    body: ReportGenerateRequest,
    user_id: int = Depends(require_auth),
) -> ReportResponse:
    """Generate a PDF report for a completed scan."""
    settings = get_settings()
    db = await get_db()

    try:
        # Lookup scan
        cursor = await db.execute(
            """SELECT scan_id, address, chain, risk_score, risk_tier, flags,
                      tx_count, first_seen, last_seen, total_inflow_usd,
                      total_outflow_usd, largest_tx_usd, labels, counterparties
               FROM scans WHERE scan_id = ?""",
            (body.scan_id,),
        )
        scan = await cursor.fetchone()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")

        # Get user tier for watermark
        cursor = await db.execute("SELECT tier FROM users WHERE id = ?", (user_id,))
        user = await cursor.fetchone()
        user_tier = user[0] if user else "free"

        # Generate PDF
        from services.pdf_generator import generate_pdf

        report_id = str(uuid.uuid4())
        file_path = REPORTS_DIR / f"{report_id}.pdf"

        scan_data = {
            "scan_id": scan[0],
            "address": scan[1],
            "chain": scan[2],
            "risk_score": scan[3],
            "risk_tier": scan[4],
            "flags": json.loads(scan[5]) if scan[5] else [],
            "tx_count": scan[6],
            "first_seen": scan[7],
            "last_seen": scan[8],
            "total_inflow_usd": scan[9],
            "total_outflow_usd": scan[10],
            "largest_tx_usd": scan[11],
            "labels": json.loads(scan[12]) if scan[12] else [],
            "counterparties": json.loads(scan[13]) if scan[13] else [],
        }

        await generate_pdf(scan_data, str(file_path), user_tier)

        file_size = file_path.stat().st_size

        # Store report record
        await db.execute(
            """INSERT INTO reports (report_id, scan_id, file_path, file_size, status)
               VALUES (?, ?, ?, ?, 'ready')""",
            (report_id, body.scan_id, str(file_path), file_size),
        )

        # Mark scan as report generated
        await db.execute(
            "UPDATE scans SET report_generated = TRUE WHERE scan_id = ?",
            (body.scan_id,),
        )
        await db.commit()

        download_url = f"/api/v1/reports/{report_id}/download"

        return ReportResponse(
            report_id=report_id,
            scan_id=body.scan_id,
            download_url=download_url,
            status="ready",
        )
    finally:
        await db.close()


@router.get("/{report_id}/download")
async def download_report(report_id: str) -> FileResponse:
    """Download a generated PDF report."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT file_path, status FROM reports WHERE report_id = ?",
            (report_id,),
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Report not found")

        if row[1] != "ready":
            raise HTTPException(status_code=202, detail="Report is still processing")

        file_path = Path(row[0])
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Report file not found on disk")

        return FileResponse(
            path=str(file_path),
            media_type="application/pdf",
            filename=f"sentinel-report-{report_id[:8]}.pdf",
        )
    finally:
        await db.close()
