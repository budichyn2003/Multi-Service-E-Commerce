"""Assistant endpoints. Phase 16 adds full tool-calling + RAG; this skeleton
already enforces the core guardrail: user identity is attached server-side and
tools call internal APIs — the LLM never receives raw DB access."""

import structlog
from fastapi import APIRouter, Header, HTTPException

from app.guardrails import sanitize_answer, validate_question
from app.tools import get_order_status, search_products
from app.models import ChatRequest, ChatResponse

log = structlog.get_logger()
router = APIRouter(prefix="/api/v1/assistant", tags=["assistant"])


def _require_user(authorization: str | None) -> str:
    """Extract the caller identity. In the full build the gateway validates the
    JWT and forwards X-User-Id; the AI service never trusts client claims about
    other users."""
    if not authorization:
        raise HTTPException(status_code=401, detail="missing authorization")
    return "anonymous"  # replaced by real JWT validation in Phase 16


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    authorization: str | None = Header(default=None),
) -> ChatResponse:
    user_id = _require_user(authorization)
    validate_question(request.message)

    # Deterministic tool loop placeholder (Phase 16 swaps in the LLM loop).
    intent_tools = []
    lowered = request.message.lower()
    if any(w in lowered for w in ("order", "status", "delivery")):
        intent_tools.append("get_order_status")
    if any(w in lowered for w in ("product", "search", "find", "stock", "price")):
        intent_tools.append("search_products")

    tool_results = {}
    if "get_order_status" in intent_tools and request.order_number:
        tool_results["order"] = get_order_status(request.order_number, user_id)
    if "search_products" in intent_tools:
        tool_results["products"] = search_products(request.message)

    answer = compose_answer(request.message, tool_results)
    sanitize_answer(answer)

    log.info(
        "assistant_chat",
        user_id=user_id,
        tools=intent_tools,
        message_length=len(request.message),
    )
    return ChatResponse(answer=answer, tools_used=intent_tools, sources=sorted(tool_results))


def compose_answer(question: str, tool_results: dict) -> str:
    if not tool_results:
        return (
            "I can help with product questions, order status, and store policies. "
            "Could you rephrase or add more detail (e.g. an order number)?"
        )
    parts = []
    if "products" in tool_results:
        products = tool_results["products"]
        if products:
            names = ", ".join(p["name"] for p in products[:3])
            parts.append(f"I found these products: {names}.")
        else:
            parts.append("I couldn't find matching products.")
    if "order" in tool_results:
        order = tool_results["order"]
        parts.append(f"Order {order['orderNumber']} is currently {order['status']}.")
    return " ".join(parts)
