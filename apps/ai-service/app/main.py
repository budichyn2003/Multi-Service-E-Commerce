"""MarketForge AI service — assistant endpoint with tool-calling architecture.

The LLM never touches the database. Every data read goes through a tool that
calls the owning service's REST API with the caller's identity (ADR-010).
"""

import structlog
from fastapi import FastAPI

from app.config import settings
from app.routers import assistant

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ]
)

app = FastAPI(
    title="MarketForge AI Service",
    version="0.1.0",
    description="AI assistant with tool calling and RAG (Phase 16 target).",
)

app.include_router(assistant.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> dict:
    # Readiness: LLM API key present; deeper checks arrive with Phase 16.
    return {
        "status": "ready" if settings.llm_api_key else "degraded",
        "llm_configured": bool(settings.llm_api_key),
    }
