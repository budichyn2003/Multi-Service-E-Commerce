"""Assistant endpoints. Enforces the core guardrail: user identity is attached
server-side and tools call internal APIs — the LLM never receives raw DB access."""

from datetime import datetime, timezone
import uuid
import structlog
from fastapi import APIRouter, Header, HTTPException

from app.guardrails import sanitize_answer, validate_question
from app.tools import get_order_status, get_customer_orders, search_products
from app.models import ChatRequest, ChatResponse, TicketRequest, TicketResponse

log = structlog.get_logger()
router = APIRouter(prefix="/api/v1/assistant", tags=["assistant"])


def _require_user(
    x_user_id: str | None,
    authorization: str | None,
) -> str:
    """Extract caller identity forwarded by API gateway or authorization header."""
    if x_user_id and x_user_id.strip():
        return x_user_id.strip()
    if authorization and authorization.strip():
        return "authenticated_user"
    return "anonymous"


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    x_user_id: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> ChatResponse:
    user_id = _require_user(x_user_id, authorization)
    validate_question(request.message)

    intent_tools = []
    lowered = request.message.lower()

    if any(w in lowered for w in ("order", "status", "delivery", "pesanan", "lacak")):
        if request.order_number or any(w in lowered for w in ("ord-", "#ord")):
            intent_tools.append("get_order_status")
        else:
            intent_tools.append("get_customer_orders")

    if any(w in lowered for w in ("product", "search", "find", "stock", "price", "cari", "harga", "produk", "beli")):
        intent_tools.append("search_products")

    tool_results = {}
    if "get_order_status" in intent_tools:
        ord_num = request.order_number
        if not ord_num:
            # extract token starting with ORD-
            for word in request.message.split():
                if word.upper().startswith("ORD-"):
                    ord_num = word.strip(",.!?# ")
                    break
        if ord_num:
            tool_results["order"] = get_order_status(ord_num, user_id)
    if "get_customer_orders" in intent_tools and user_id != "anonymous":
        tool_results["customer_orders"] = get_customer_orders(user_id)
    if "search_products" in intent_tools:
        tool_results["products"] = search_products(request.message)

    answer = compose_answer(request.message, tool_results)
    answer = sanitize_answer(answer)

    log.info(
        "assistant_chat",
        user_id=user_id,
        tools=intent_tools,
        message_length=len(request.message),
    )
    return ChatResponse(answer=answer, tools_used=intent_tools, sources=sorted(tool_results))


@router.post("/tickets")
def create_ticket(
    request: TicketRequest,
    x_user_id: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> dict:
    user_id = _require_user(x_user_id, authorization)
    validate_question(request.description)

    ticket_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    log.info(
        "support_ticket_created",
        ticket_id=ticket_id,
        user_id=user_id,
        order_number=request.order_number,
        subject=request.subject,
    )

    return {
        "success": true if True else False,
        "data": {
            "id": ticket_id,
            "userId": user_id if user_id != "anonymous" else None,
            "orderNumber": request.order_number,
            "subject": request.subject,
            "description": request.description,
            "status": "OPEN",
            "createdAt": now_iso,
        },
    }


def compose_answer(question: str, tool_results: dict) -> str:
    if not tool_results:
        return (
            "Halo! Saya asisten belanja MarketForge. Saya dapat membantu mencari produk, "
            "mengecek status pesanan, serta memberikan informasi seputar toko. Ada yang bisa dibantu?"
        )
    parts = []
    if "products" in tool_results:
        products = tool_results["products"]
        if products:
            names = ", ".join(f"{p['name']} (Rp {int(p['price']):,})" for p in products[:3])
            parts.append(f"Berikut produk yang ditemukan: {names}.")
        else:
            parts.append("Maaf, tidak ditemukan produk yang cocok dengan pencarian Anda.")
    if "order" in tool_results:
        order = tool_results["order"]
        parts.append(f"Pesanan {order['orderNumber']} saat ini berstatus {order['status']}.")
    if "customer_orders" in tool_results:
        orders = tool_results["customer_orders"]
        if orders:
            ord_list = ", ".join(f"{o['orderNumber']} ({o['status']})" for o in orders)
            parts.append(f"Daftar pesanan Anda: {ord_list}.")
        else:
            parts.append("Anda belum memiliki riwayat pesanan.")
    return " ".join(parts)
