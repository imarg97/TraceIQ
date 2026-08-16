from fastapi import APIRouter, Response
from pydantic import BaseModel
from app.models.schemas import PCAPAnalysisResult
from app.services.report_service import generate_report

router = APIRouter()

class ReportExportRequest(BaseModel):
    result: PCAPAnalysisResult
    format: str = "html"  # html, json, csv, pdf

@router.post("/export")
def export_report(req: ReportExportRequest):
    """Exports a PCAP analysis report in PDF, HTML, JSON, or CSV format."""
    content, media_type, ext = generate_report(req.result, req.format)
    filename = f"traceiq_report_{req.result.file_name}.{ext}"
    
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
