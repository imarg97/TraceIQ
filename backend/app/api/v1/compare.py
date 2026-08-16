from fastapi import APIRouter
from pydantic import BaseModel
from app.models.schemas import PCAPAnalysisResult, PCAPCompareResult
from app.services.compare_service import compare_pcap_results

router = APIRouter()

class CompareRequest(BaseModel):
    pcap_a: PCAPAnalysisResult
    pcap_b: PCAPAnalysisResult

@router.post("/", response_model=PCAPCompareResult)
def compare_pcaps(req: CompareRequest):
    """Compares two PCAP analysis result objects and returns delta metrics."""
    return compare_pcap_results(req.pcap_a, req.pcap_b)
