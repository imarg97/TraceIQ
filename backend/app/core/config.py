import os
from typing import Optional

class Settings:
    PROJECT_NAME: str = "TraceIQ"
    PROJECT_TAGLINE: str = "Understand Every Packet. Resolve Every Issue."
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # AI Settings
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "auto")  # auto, openai, local_llm, heuristic
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    LOCAL_LLM_URL: str = os.getenv("LOCAL_LLM_URL", "http://localhost:11434/v1")
    
    # Storage & Samples
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    SAMPLES_DIR: str = os.path.join(BASE_DIR, "samples")

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.SAMPLES_DIR, exist_ok=True)
