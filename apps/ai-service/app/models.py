from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: str | None = None
    order_number: str | None = Field(default=None, max_length=30)


class ChatResponse(BaseModel):
    answer: str
    tools_used: list[str]
    sources: list[str]
