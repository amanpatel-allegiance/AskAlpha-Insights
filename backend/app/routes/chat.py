from fastapi import APIRouter
from pydantic import BaseModel
from app.services import bedrock_chat

router = APIRouter(prefix="/api/chat", tags=["chat"])

VALID_RANGES = {"1d", "7d", "30d", "this_month"}


class HistoryMessage(BaseModel):
    role: str     # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    range: str = "7d"
    history: list[HistoryMessage] = []


class ChatResponse(BaseModel):
    reply: str


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    range_str = req.range if req.range in VALID_RANGES else "7d"
    history = [{"role": h.role, "content": h.content} for h in req.history]
    reply = await bedrock_chat.chat(req.message.strip(), range_str, history=history)
    return ChatResponse(reply=reply)
