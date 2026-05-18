"""PDF report generation using WeasyPrint + Jinja2."""

import logging
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger(__name__)

# Jinja2 template environment
TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))


async def generate_pdf(
    scan_data: dict,
    output_path: str,
    user_tier: str = "free",
) -> str:
    """
    Generate a PDF report from scan data.

    Args:
        scan_data: Dictionary with scan results
        output_path: Path to write the PDF file
        user_tier: User tier for watermark logic ('free', 'pro', 'api')

    Returns:
        Path to generated PDF file
    """
    try:
        from weasyprint import HTML
    except ImportError:
        logger.error("WeasyPrint not installed — generating HTML-only report")
        # Fallback: save as HTML
        html_content = _render_html(scan_data, user_tier)
        html_path = output_path.replace(".pdf", ".html")
        with open(html_path, "w") as f:
            f.write(html_content)
        return html_path

    html_content = _render_html(scan_data, user_tier)

    # Generate PDF
    html = HTML(string=html_content)
    html.write_pdf(output_path)

    logger.info("PDF report generated: %s", output_path)
    return output_path


def _render_html(scan_data: dict, user_tier: str) -> str:
    """Render the Jinja2 HTML template with scan data."""
    template = jinja_env.get_template("report.html")

    # Risk tier colors
    tier_colors = {
        "LOW": "#22c55e",
        "MEDIUM": "#eab308",
        "HIGH": "#f97316",
        "CRITICAL": "#ef4444",
    }

    return template.render(
        scan=scan_data,
        tier_color=tier_colors.get(scan_data.get("risk_tier", "LOW"), "#22c55e"),
        show_watermark=(user_tier == "free"),
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        year=datetime.now(timezone.utc).year,
    )
