"""Tool layer: each tool calls the owning service's REST API. Tools are the
only path from the LLM to data — authorization happens in the target service
using the forwarded identity, never inside the model."""

import httpx

from app.config import settings


def search_products(query: str, limit: int = 5) -> list[dict]:
    try:
        response = httpx.get(
            f"{settings.commerce_url}/api/v1/products",
            params={"q": query, "limit": limit},
            timeout=5.0,
        )
        response.raise_for_status()
        items = response.json().get("data", {}).get("items", [])
        return [{"name": p["name"], "slug": p["slug"], "price": p["price"]} for p in items]
    except httpx.HTTPError:
        return []


def get_order_status(order_number: str, user_id: str) -> dict:
    """Phase 16 forwards the authenticated identity via headers so the order
    service can enforce per-user authorization."""
    try:
        response = httpx.get(
            f"{settings.order_service_url}/api/v1/orders/{order_number}",
            headers={"X-User-Id": user_id},
            timeout=5.0,
        )
        response.raise_for_status()
        order = response.json().get("data", {})
        return {"orderNumber": order.get("orderNumber"), "status": order.get("status")}
    except httpx.HTTPError:
        return {"orderNumber": order_number, "status": "UNKNOWN"}
