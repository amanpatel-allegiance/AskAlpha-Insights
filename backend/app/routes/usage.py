from fastapi import APIRouter, Query, HTTPException, Path
from fastapi.responses import Response
from typing import Optional
from app.services import usage_service
from app.models.responses import (
    SummaryResponse,
    DailyActivityPoint,
    TopAgent,
    ActivityEvent,
    AgentDetail,
    ExtendedSummary,
    TopProject,
    FeatureAdoptionResponse,
    VideoPipelineResponse,
    RetentionPoint,
    HeatmapCell,
    DailyCostPoint,
)

router = APIRouter(prefix="/api/usage", tags=["usage"])

VALID_RANGES   = {"1d", "7d", "30d", "this_month"}
VALID_ROLES    = {"all", "admin", "salesagent"}
VALID_FEATURES = {"all", "chat", "video", "studio"}


def _validate_range(range_str: str) -> str:
    if range_str not in VALID_RANGES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid range '{range_str}'. Must be one of: {', '.join(sorted(VALID_RANGES))}",
        )
    return range_str


def _validate_role(role: str) -> str:
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role '{role}'.")
    return role


def _validate_feature(feature: str) -> str:
    if feature not in VALID_FEATURES:
        raise HTTPException(status_code=400, detail=f"Invalid feature '{feature}'.")
    return feature


@router.get("/summary", response_model=SummaryResponse)
async def summary(
    range: str = Query(default="7d"),
    role: str = Query(default="all"),
) -> SummaryResponse:
    _validate_range(range)
    _validate_role(role)
    return await usage_service.get_summary(range, role=role)


@router.get("/daily-activity", response_model=list[DailyActivityPoint])
async def daily_activity(
    range: str = Query(default="7d"),
    feature: str = Query(default="all"),
) -> list[DailyActivityPoint]:
    _validate_range(range)
    _validate_feature(feature)
    return await usage_service.get_daily_activity(range, feature=feature)


@router.get("/top-agents", response_model=list[TopAgent])
async def top_agents(
    range: str = Query(default="7d"),
    limit: int = Query(default=10, ge=1, le=100),
    role: str = Query(default="all"),
) -> list[TopAgent]:
    _validate_range(range)
    _validate_role(role)
    return await usage_service.get_top_agents(range, limit=limit, role=role)


@router.get("/recent-activity", response_model=list[ActivityEvent])
async def recent_activity(
    range: str = Query(default="7d"),
    limit: int = Query(default=50, ge=1, le=200),
    role: str = Query(default="all"),
    feature: str = Query(default="all"),
) -> list[ActivityEvent]:
    _validate_range(range)
    _validate_role(role)
    _validate_feature(feature)
    return await usage_service.get_recent_activity(range, limit=limit, role=role, feature=feature)


@router.get("/extended-summary", response_model=ExtendedSummary)
async def extended_summary(range: str = Query(default="7d")) -> ExtendedSummary:
    _validate_range(range)
    return await usage_service.get_extended_summary(range)


@router.get("/top-projects", response_model=list[TopProject])
async def top_projects(
    range: str = Query(default="7d"),
    limit: int = Query(default=10, ge=1, le=50),
) -> list[TopProject]:
    _validate_range(range)
    return await usage_service.get_top_projects(range, limit=limit)


@router.get("/feature-adoption", response_model=FeatureAdoptionResponse)
async def feature_adoption(range: str = Query(default="7d")) -> FeatureAdoptionResponse:
    _validate_range(range)
    return await usage_service.get_feature_adoption(range)


@router.get("/video-pipeline", response_model=VideoPipelineResponse)
async def video_pipeline() -> VideoPipelineResponse:
    return await usage_service.get_video_pipeline()


@router.get("/retention", response_model=list[RetentionPoint])
async def retention(range: str = Query(default="30d")) -> list[RetentionPoint]:
    _validate_range(range)
    return await usage_service.get_retention(range)


@router.get("/hourly-heatmap", response_model=list[HeatmapCell])
async def hourly_heatmap(range: str = Query(default="30d")) -> list[HeatmapCell]:
    _validate_range(range)
    return await usage_service.get_hourly_heatmap(range)


@router.get("/cost-trend", response_model=list[DailyCostPoint])
async def cost_trend(range: str = Query(default="7d")) -> list[DailyCostPoint]:
    _validate_range(range)
    return await usage_service.get_cost_trend(range)


@router.get("/agent/{agent_id}", response_model=AgentDetail)
async def agent_detail(
    agent_id: str = Path(...),
    range: str = Query(default="7d"),
) -> AgentDetail:
    _validate_range(range)
    detail = await usage_service.get_agent_detail(agent_id, range)
    if detail is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return detail


@router.get("/export")
async def export(range: str = Query(default="7d")) -> Response:
    _validate_range(range)
    csv_content = await usage_service.get_export_csv(range)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=askalpha-usage-{range}.csv"},
    )
