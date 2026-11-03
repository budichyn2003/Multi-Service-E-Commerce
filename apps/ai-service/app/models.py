from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: str | None = None
    order_number: str | None = Field(default=None, max_length=30)


class ChatResponse(BaseModel):
    answer: str
    tools_used: list[str]
    sources: list[str]


class TicketRequest(BaseModel):
    subject: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=5, max_length=2000)
    order_number: str | None = Field(default=None, max_length=30)


class TicketResponse(BaseModel):
    id: str
    user_id: str | None = None
    order_number: str | None = None
    subject: str
    description: str
    status: str
    created_at: str
