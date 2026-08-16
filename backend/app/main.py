from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import pcap, ai, compare, reports

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Telecom Packet Analysis & Troubleshooting Platform for IMS & VoLTE",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(pcap.router, prefix=f"{settings.API_V1_STR}/pcap", tags=["PCAP Parsing & Samples"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["AI Telecom Assistant"])
app.include_router(compare.router, prefix=f"{settings.API_V1_STR}/compare", tags=["PCAP Comparison"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["Report Generation"])

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "tagline": settings.PROJECT_TAGLINE,
        "version": settings.VERSION,
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
