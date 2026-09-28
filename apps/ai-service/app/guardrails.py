"""AI guardrails (requirements §43).

The AI must not invent order status, availability, or prices; must not expose
another user's data; must not perform admin operations. Input-side rules here
block prompt-injection patterns; output-side rules strip common jailbreak
artifacts. Full LLM integration in Phase 16 keeps these checks mandatory."""

import re

FORBIDDEN_PATTERNS = [
    r"ignore (all|any|previous) instructions",
    r"system prompt",
    r"you are now",
    r"act as (an? )?(admin|root|developer)",
    r"drop\s+table",
    r"(delete|update)\s+from\s",
]

ADMIN_REQUEST_PATTERNS = [
    r"(cancel|refund|approve)\s+(all\s+)?(any\s+)?orders?\b.*(\badmin\b|\ball\b)",
    r"(list|show|export)\s+(all\s+)?users",
]


def validate_question(message: str) -> None:
    lowered = message.lower()
    for pattern in FORBIDDEN_PATTERNS + ADMIN_REQUEST_PATTERNS:
        if re.search(pattern, lowered):
            raise ValueError("request rejected by guardrails")


def sanitize_answer(answer: str) -> str:
    """Defense in depth: strip accidental secret-looking strings."""
    return re.sub(r"(sk-[A-Za-z0-9]{8,}|SB-[A-Za-z]+-key-[A-Za-z0-9]+)", "[redacted]", answer)
