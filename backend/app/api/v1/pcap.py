import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List, Dict, Any
from app.core.config import settings
from app.models.schemas import PCAPAnalysisResult
from app.samples.sample_pcap_data import get_sample_pcap
from app.services.pcap_parser import parse_pcap_file

router = APIRouter()

@router.get("/samples", response_model=List[Dict[str, Any]])
def list_samples():
    """Returns available built-in telecom PCAP samples."""
    return [
        {
            "id": "volte_call_success",
            "name": "Normal VoLTE IMS Call",
            "tag": "Successful Call",
            "description": "Standard SIP INVITE -> 180 Ringing -> 200 OK -> AMR-WB HD Voice RTP stream -> BYE.",
            "packet_count": 10,
            "duration": "15.4s",
            "health_score": 98
        },
        {
            "id": "ims_401_auth_challenge",
            "name": "IMS AKA 401 Auth Challenge",
            "tag": "AKA Digest Auth",
            "description": "3GPP AKA registration flow (REGISTER -> 401 Unauthorized Nonce Challenge -> Authenticated REGISTER -> 200 OK).",
            "packet_count": 4,
            "duration": "0.14s",
            "health_score": 100
        },
        {
            "id": "invite_487_cancelled",
            "name": "SIP 487 Request Terminated",
            "tag": "Caller Abandoned",
            "description": "Call cancelled by caller during ringing phase (INVITE -> 180 Ringing -> CANCEL -> 487 Request Terminated).",
            "packet_count": 7,
            "duration": "1.89s",
            "health_score": 85
        },
        {
            "id": "503_server_overload",
            "name": "SIP 503 TAS Node Overload",
            "tag": "Node Exhaustion",
            "description": "Telephony Application Server (TAS) CPU overload causing 503 Service Unavailable call failure.",
            "packet_count": 6,
            "duration": "0.49s",
            "health_score": 35
        },
        {
            "id": "dns_lookup_timeout",
            "name": "DNS Resolution Timeout",
            "tag": "Infrastructure Timeout",
            "description": "Unresponsive CoreDNS server causing 3 NAPTR retransmissions and 408 Request Timeout.",
            "packet_count": 4,
            "duration": "4.01s",
            "health_score": 50
        }
    ]

@router.get("/sample/{sample_id}", response_model=PCAPAnalysisResult)
def load_sample_pcap(sample_id: str):
    """Loads a specific pre-analyzed sample PCAP dataset."""
    return get_sample_pcap(sample_id)

@router.post("/upload", response_model=PCAPAnalysisResult)
async def upload_pcap(file: UploadFile = File(...)):
    """Uploads and analyzes a PCAP / PCAPNG file."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, file.filename)
    
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = parse_pcap_file(filepath)
        return result
    except Exception as e:
        print(f"Error processing PCAP upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process PCAP file: {str(e)}")
