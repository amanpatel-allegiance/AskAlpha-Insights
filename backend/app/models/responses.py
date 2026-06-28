from pydantic import BaseModel
from typing import Optional


class HealthResponse(BaseModel):
    status: str


class DeltaValue(BaseModel):
    value: int
    pct: Optional[float] = None


class SummaryResponse(BaseModel):
    active_agents: int
    chat_messages: int
    videos_generated: int
    avatar_videos: int
    cinematic_videos: int
    studio_jobs: int
    studio_completed: int
    studio_failed: int
    deltas: dict[str, DeltaValue]


class ExtendedSummary(BaseModel):
    total_cost_usd: float
    video_success_rate: float   # 0–100
    new_agents: int             # accepted invitations in period
    total_agents: int           # all-time profiles count


class DailyActivityPoint(BaseModel):
    date: str
    chat: int
    video: int
    studio: int


class TopAgent(BaseModel):
    agent_id: str
    name: str
    email: str
    role: str
    chat_count: int
    video_count: int
    studio_count: int
    estimated_cost_usd: float


class ActivityEvent(BaseModel):
    id: str
    feature: str
    agent_name: str
    timestamp: str
    status: str
    prompt: str


# ── New analytics models ────────────────────────────────────────────────────

class TopProject(BaseModel):
    project_id: int
    project_name: str
    developer_name: str
    region: Optional[str] = None
    query_count: int


class FeatureAdoptionResponse(BaseModel):
    total_agents: int
    chat_agents: int
    video_agents: int
    studio_agents: int
    chat_pct: float
    video_pct: float
    studio_pct: float


class VideoPipelineResponse(BaseModel):
    pending: int
    processing: int
    completed: int
    failed: int
    total: int
    success_rate: float


class RetentionPoint(BaseModel):
    week: str       # ISO date of week start (Monday)
    unique_agents: int


class HeatmapCell(BaseModel):
    dow: int        # 0 = Sunday … 6 = Saturday
    hour: int       # 0–23 (Dubai time)
    count: int


class DailyCostPoint(BaseModel):
    date: str
    estimated_cost_usd: float


# ── Agent detail ────────────────────────────────────────────────────────────

class AgentStatSummary(BaseModel):
    chat_count: int
    video_count: int
    avatar_count: int
    cinematic_count: int
    studio_count: int
    studio_completed: int
    studio_failed: int
    conversations_count: int
    estimated_cost_usd: float


class AgentChatMessage(BaseModel):
    id: str
    content: str
    timestamp: str
    conversation_id: str


class AgentVideoEvent(BaseModel):
    id: str
    mode: str
    status: str
    script: str
    created_at: str


class AgentStudioEvent(BaseModel):
    id: str
    title: str
    tool: str
    status: str
    created_at: str


class AgentDetail(BaseModel):
    agent_id: str
    name: str
    email: str
    role: str
    member_since: str
    summary: AgentStatSummary
    daily_activity: list[DailyActivityPoint]
    recent_chats: list[AgentChatMessage]
    recent_videos: list[AgentVideoEvent]
    recent_studio: list[AgentStudioEvent]
