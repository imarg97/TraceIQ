from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.services.ai_service import ask_telecom_ai

router = APIRouter()

class AskAIRequest(BaseModel):
    prompt: str
    pcap_context: Dict[str, Any]

@router.post("/ask")
async def ask_ai(req: AskAIRequest):
    """Processes interactive AI Telecom Copilot questions."""
    res = await ask_telecom_ai(req.prompt, req.pcap_context)
    return res
