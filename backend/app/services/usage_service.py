"""
Usage service — all database queries for the analytics dashboard.

Table mapping:
  Chat     → ask_alpha_conversations + ask_alpha_messages
  Video    → videos (mode: avatar | cinematic)
  Studio   → studio_shots
  Agents   → profiles
"""
from datetime import datetime
import asyncpg
from app.db.client import get_pool
from app.services.cost_calculator import cost_calculator
from app.services.date_range import parse_range, previous_period
from app.models.responses import (
    SummaryResponse,
    DeltaValue,
    DailyActivityPoint,
    TopAgent,
    ActivityEvent,
    AgentDetail,
    AgentStatSummary,
    AgentChatMessage,
    AgentVideoEvent,
    AgentStudioEvent,
    ExtendedSummary,
    TopProject,
    FeatureAdoptionResponse,
    VideoPipelineResponse,
    RetentionPoint,
    HeatmapCell,
    DailyCostPoint,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pct_delta(current: int, prev: int) -> float | None:
    if prev == 0:
        return None
    return round((current - prev) / prev * 100, 1)


def _display_name(first: str | None, last: str | None, email: str | None) -> str:
    parts = [p for p in [first, last] if p]
    if parts:
        return " ".join(parts)
    if email:
        return email.split("@")[0]
    return "Unknown"


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

async def get_summary(range_str: str, role: str = "all") -> SummaryResponse:
    start, end = parse_range(range_str)
    prev_start, prev_end = previous_period(start, end)
    pool = await get_pool()

    async with pool.acquire() as conn:
        # Active agents (unique users who started conversations in period)
        active_agents = await conn.fetchval(
            """
            SELECT COUNT(DISTINCT c.user_id)
            FROM ask_alpha_conversations c
            JOIN profiles p ON p.id = c.user_id
            WHERE c.created_at >= $1 AND c.created_at < $2
              AND ($3 = 'all' OR p.role = $3)
            """,
            start, end, role,
        ) or 0

        prev_active_agents = await conn.fetchval(
            """
            SELECT COUNT(DISTINCT c.user_id)
            FROM ask_alpha_conversations c
            JOIN profiles p ON p.id = c.user_id
            WHERE c.created_at >= $1 AND c.created_at < $2
              AND ($3 = 'all' OR p.role = $3)
            """,
            prev_start, prev_end, role,
        ) or 0

        # Chat messages (user-role messages only)
        chat_messages = await conn.fetchval(
            """
            SELECT COUNT(m.id)
            FROM ask_alpha_messages m
            JOIN ask_alpha_conversations c ON c.id = m.conversation_id
            WHERE m.role = 'user'
              AND c.created_at >= $1 AND c.created_at < $2
            """,
            start, end,
        ) or 0

        prev_chat_messages = await conn.fetchval(
            """
            SELECT COUNT(m.id)
            FROM ask_alpha_messages m
            JOIN ask_alpha_conversations c ON c.id = m.conversation_id
            WHERE m.role = 'user'
              AND c.created_at >= $1 AND c.created_at < $2
            """,
            prev_start, prev_end,
        ) or 0

        # Video generation
        video_row = await conn.fetchrow(
            """
            SELECT
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE mode = 'avatar') AS avatar,
              COUNT(*) FILTER (WHERE mode = 'cinematic') AS cinematic
            FROM videos
            WHERE created_at >= $1 AND created_at < $2
            """,
            start, end,
        )
        videos_generated = int(video_row["total"] or 0)
        avatar_videos = int(video_row["avatar"] or 0)
        cinematic_videos = int(video_row["cinematic"] or 0)

        prev_videos = await conn.fetchval(
            "SELECT COUNT(*) FROM videos WHERE created_at >= $1 AND created_at < $2",
            prev_start, prev_end,
        ) or 0

        # Studio jobs
        studio_row = await conn.fetchrow(
            """
            SELECT
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'completed') AS completed,
              COUNT(*) FILTER (WHERE status = 'failed') AS failed
            FROM studio_shots
            WHERE created_at >= $1 AND created_at < $2
            """,
            start, end,
        )
        studio_jobs = int(studio_row["total"] or 0)
        studio_completed = int(studio_row["completed"] or 0)
        studio_failed = int(studio_row["failed"] or 0)

        prev_studio = await conn.fetchval(
            "SELECT COUNT(*) FROM studio_shots WHERE created_at >= $1 AND created_at < $2",
            prev_start, prev_end,
        ) or 0

    deltas = {
        "active_agents": DeltaValue(
            value=int(active_agents - prev_active_agents),
            pct=_pct_delta(int(active_agents), int(prev_active_agents)),
        ),
        "chat_messages": DeltaValue(
            value=int(chat_messages - prev_chat_messages),
            pct=_pct_delta(int(chat_messages), int(prev_chat_messages)),
        ),
        "videos_generated": DeltaValue(
            value=int(videos_generated - prev_videos),
            pct=_pct_delta(videos_generated, int(prev_videos)),
        ),
        "studio_jobs": DeltaValue(
            value=int(studio_jobs - prev_studio),
            pct=_pct_delta(studio_jobs, int(prev_studio)),
        ),
    }

    return SummaryResponse(
        active_agents=int(active_agents),
        chat_messages=int(chat_messages),
        videos_generated=videos_generated,
        avatar_videos=avatar_videos,
        cinematic_videos=cinematic_videos,
        studio_jobs=studio_jobs,
        studio_completed=studio_completed,
        studio_failed=studio_failed,
        deltas=deltas,
    )


# ---------------------------------------------------------------------------
# Daily activity
# ---------------------------------------------------------------------------

async def get_daily_activity(range_str: str, feature: str = "all") -> list[DailyActivityPoint]:
    start, end = parse_range(range_str)
    pool = await get_pool()

    async with pool.acquire() as conn:
        chat_rows = await conn.fetch(
            """
            SELECT DATE(c.created_at AT TIME ZONE 'UTC') AS day, COUNT(m.id) AS cnt
            FROM ask_alpha_messages m
            JOIN ask_alpha_conversations c ON c.id = m.conversation_id
            WHERE m.role = 'user'
              AND c.created_at >= $1 AND c.created_at < $2
            GROUP BY day
            """,
            start, end,
        )

        video_rows = await conn.fetch(
            """
            SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS cnt
            FROM videos
            WHERE created_at >= $1 AND created_at < $2
            GROUP BY day
            """,
            start, end,
        )

        studio_rows = await conn.fetch(
            """
            SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS cnt
            FROM studio_shots
            WHERE created_at >= $1 AND created_at < $2
            GROUP BY day
            """,
            start, end,
        )

    chat_map = {str(r["day"]): int(r["cnt"]) for r in chat_rows}
    video_map = {str(r["day"]): int(r["cnt"]) for r in video_rows}
    studio_map = {str(r["day"]): int(r["cnt"]) for r in studio_rows}

    # Generate all dates in range
    from datetime import timedelta
    days: list[DailyActivityPoint] = []
    current = start.date()
    end_date = end.date()
    while current <= end_date:
        key = str(current)
        days.append(DailyActivityPoint(
            date=key,
            chat=chat_map.get(key, 0),
            video=video_map.get(key, 0),
            studio=studio_map.get(key, 0),
        ))
        current += timedelta(days=1)

    return days


# ---------------------------------------------------------------------------
# Top agents
# ---------------------------------------------------------------------------

async def get_top_agents(range_str: str, limit: int = 20, role: str = "all") -> list[TopAgent]:
    start, end = parse_range(range_str)
    pool = await get_pool()

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            WITH chat_counts AS (
                SELECT c.user_id, COUNT(m.id) AS chat_count
                FROM ask_alpha_messages m
                JOIN ask_alpha_conversations c ON c.id = m.conversation_id
                WHERE m.role = 'user'
                  AND c.created_at >= $1 AND c.created_at < $2
                GROUP BY c.user_id
            ),
            video_counts AS (
                SELECT requested_by AS user_id,
                       COUNT(*) AS video_total,
                       COUNT(*) FILTER (WHERE mode = 'avatar') AS avatar_count,
                       COUNT(*) FILTER (WHERE mode = 'cinematic') AS cinematic_count
                FROM videos
                WHERE created_at >= $1 AND created_at < $2
                GROUP BY requested_by
            ),
            studio_counts AS (
                SELECT user_id, COUNT(*) AS studio_count
                FROM studio_shots
                WHERE created_at >= $1 AND created_at < $2
                GROUP BY user_id
            ),
            all_users AS (
                SELECT user_id FROM chat_counts
                UNION SELECT user_id FROM video_counts
                UNION SELECT user_id FROM studio_counts
            )
            SELECT
                p.id::text AS agent_id,
                p.first_name,
                p.last_name,
                p.email,
                p.role,
                COALESCE(cc.chat_count, 0) AS chat_count,
                COALESCE(vc.video_total, 0) AS video_count,
                COALESCE(vc.avatar_count, 0) AS avatar_count,
                COALESCE(vc.cinematic_count, 0) AS cinematic_count,
                COALESCE(sc.studio_count, 0) AS studio_count
            FROM all_users au
            JOIN profiles p ON p.id = au.user_id
            LEFT JOIN chat_counts cc ON cc.user_id = au.user_id
            LEFT JOIN video_counts vc ON vc.user_id = au.user_id
            LEFT JOIN studio_counts sc ON sc.user_id = au.user_id
            WHERE ($3 = 'all' OR p.role = $3)
            ORDER BY (COALESCE(cc.chat_count, 0) + COALESCE(vc.video_total, 0) + COALESCE(sc.studio_count, 0)) DESC
            LIMIT $4
            """,
            start, end, role, limit,
        )

    agents = []
    for r in rows:
        chat_n = int(r["chat_count"])
        video_n = int(r["video_count"])
        avatar_n = int(r["avatar_count"])
        cinematic_n = int(r["cinematic_count"])
        studio_n = int(r["studio_count"])

        estimated_cost = cost_calculator.estimate(chat_n, avatar_n, cinematic_n, studio_n)

        agents.append(TopAgent(
            agent_id=r["agent_id"],
            name=_display_name(r["first_name"], r["last_name"], r["email"]),
            email=r["email"] or "",
            role=r["role"] or "salesagent",
            chat_count=chat_n,
            video_count=video_n,
            studio_count=studio_n,
            estimated_cost_usd=estimated_cost,
        ))

    return agents


# ---------------------------------------------------------------------------
# Recent activity
# ---------------------------------------------------------------------------

async def get_recent_activity(range_str: str, limit: int = 50, role: str = "all", feature: str = "all") -> list[ActivityEvent]:
    start, end = parse_range(range_str)
    pool = await get_pool()

    async with pool.acquire() as conn:
        # Chat activity — latest user messages per conversation
        chat_rows = await conn.fetch(
            """
            SELECT
                m.id::text AS id,
                'chat' AS feature,
                COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown') AS agent_name,
                m.created_at,
                'completed' AS status,
                LEFT(m.content, 200) AS prompt
            FROM ask_alpha_messages m
            JOIN ask_alpha_conversations c ON c.id = m.conversation_id
            LEFT JOIN profiles p ON p.id = c.user_id
            WHERE m.role = 'user'
              AND c.created_at >= $1 AND c.created_at < $2
              AND ($3 = 'all' OR p.role = $3)
              AND ($4 = 'all' OR $4 = 'chat')
            ORDER BY m.created_at DESC
            LIMIT $5
            """,
            start, end, role, feature, limit // 2,
        )

        # Video activity
        video_rows = await conn.fetch(
            """
            SELECT
                v.id::text AS id,
                'video' AS feature,
                COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown') AS agent_name,
                v.created_at,
                v.status,
                LEFT(v.script, 200) AS prompt
            FROM videos v
            LEFT JOIN profiles p ON p.id = v.requested_by
            WHERE v.created_at >= $1 AND v.created_at < $2
              AND ($3 = 'all' OR p.role = $3)
              AND ($4 = 'all' OR $4 = 'video')
            ORDER BY v.created_at DESC
            LIMIT $5
            """,
            start, end, role, feature, limit // 4,
        )

        # Studio activity
        studio_rows = await conn.fetch(
            """
            SELECT
                s.id::text AS id,
                'studio' AS feature,
                COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown') AS agent_name,
                s.created_at,
                s.status,
                s.title AS prompt
            FROM studio_shots s
            LEFT JOIN profiles p ON p.id = s.user_id
            WHERE s.created_at >= $1 AND s.created_at < $2
              AND ($3 = 'all' OR p.role = $3)
              AND ($4 = 'all' OR $4 = 'studio')
            ORDER BY s.created_at DESC
            LIMIT $5
            """,
            start, end, role, feature, limit // 4,
        )

    all_events = []
    for r in [*chat_rows, *video_rows, *studio_rows]:
        all_events.append(ActivityEvent(
            id=r["id"],
            feature=r["feature"],
            agent_name=r["agent_name"] or "Unknown",
            timestamp=r["created_at"].isoformat(),
            status=r["status"] or "completed",
            prompt=r["prompt"] or "",
        ))

    all_events.sort(key=lambda e: e.timestamp, reverse=True)
    return all_events[:limit]


# ---------------------------------------------------------------------------
# Agent detail
# ---------------------------------------------------------------------------

async def get_agent_detail(agent_id: str, range_str: str) -> AgentDetail | None:
    start, end = parse_range(range_str)
    pool = await get_pool()

    async with pool.acquire() as conn:
        # Profile
        profile = await conn.fetchrow(
            "SELECT id, first_name, last_name, email, role, created_at FROM profiles WHERE id = $1",
            agent_id,
        )
        if not profile:
            return None

        # Summary counts
        chat_row = await conn.fetchrow(
            """
            SELECT COUNT(m.id) AS msg_count, COUNT(DISTINCT c.id) AS conv_count
            FROM ask_alpha_messages m
            JOIN ask_alpha_conversations c ON c.id = m.conversation_id
            WHERE m.role = 'user' AND c.user_id = $1
              AND c.created_at >= $2 AND c.created_at < $3
            """,
            agent_id, start, end,
        )
        video_row = await conn.fetchrow(
            """
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE mode = 'avatar') AS avatar,
                COUNT(*) FILTER (WHERE mode = 'cinematic') AS cinematic
            FROM videos
            WHERE requested_by = $1 AND created_at >= $2 AND created_at < $3
            """,
            agent_id, start, end,
        )
        studio_row = await conn.fetchrow(
            """
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed,
                COUNT(*) FILTER (WHERE status = 'failed') AS failed
            FROM studio_shots
            WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
            """,
            agent_id, start, end,
        )

        # Daily activity for this agent
        chat_daily = await conn.fetch(
            """
            SELECT DATE(c.created_at AT TIME ZONE 'UTC') AS day, COUNT(m.id) AS cnt
            FROM ask_alpha_messages m
            JOIN ask_alpha_conversations c ON c.id = m.conversation_id
            WHERE m.role = 'user' AND c.user_id = $1
              AND c.created_at >= $2 AND c.created_at < $3
            GROUP BY day
            """,
            agent_id, start, end,
        )
        video_daily = await conn.fetch(
            """
            SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS cnt
            FROM videos
            WHERE requested_by = $1 AND created_at >= $2 AND created_at < $3
            GROUP BY day
            """,
            agent_id, start, end,
        )
        studio_daily = await conn.fetch(
            """
            SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS cnt
            FROM studio_shots
            WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
            GROUP BY day
            """,
            agent_id, start, end,
        )

        # Recent chats
        recent_chats_rows = await conn.fetch(
            """
            SELECT m.id::text, m.content, m.created_at, c.id::text AS conversation_id
            FROM ask_alpha_messages m
            JOIN ask_alpha_conversations c ON c.id = m.conversation_id
            WHERE m.role = 'user' AND c.user_id = $1
              AND c.created_at >= $2 AND c.created_at < $3
            ORDER BY m.created_at DESC
            LIMIT 20
            """,
            agent_id, start, end,
        )

        # Recent videos
        recent_videos_rows = await conn.fetch(
            """
            SELECT id::text, mode, status, script, created_at
            FROM videos
            WHERE requested_by = $1 AND created_at >= $2 AND created_at < $3
            ORDER BY created_at DESC
            LIMIT 10
            """,
            agent_id, start, end,
        )

        # Recent studio jobs
        recent_studio_rows = await conn.fetch(
            """
            SELECT id::text, title, tool, status, created_at
            FROM studio_shots
            WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
            ORDER BY created_at DESC
            LIMIT 10
            """,
            agent_id, start, end,
        )

    # Build daily activity map
    from datetime import timedelta
    chat_map = {str(r["day"]): int(r["cnt"]) for r in chat_daily}
    video_map = {str(r["day"]): int(r["cnt"]) for r in video_daily}
    studio_map = {str(r["day"]): int(r["cnt"]) for r in studio_daily}

    daily = []
    current = start.date()
    while current <= end.date():
        key = str(current)
        daily.append(DailyActivityPoint(
            date=key,
            chat=chat_map.get(key, 0),
            video=video_map.get(key, 0),
            studio=studio_map.get(key, 0),
        ))
        current += timedelta(days=1)

    chat_n = int(chat_row["msg_count"] or 0)
    avatar_n = int(video_row["avatar"] or 0)
    cinematic_n = int(video_row["cinematic"] or 0)
    studio_n = int(studio_row["total"] or 0)

    return AgentDetail(
        agent_id=str(profile["id"]),
        name=_display_name(profile["first_name"], profile["last_name"], profile["email"]),
        email=profile["email"] or "",
        role=profile["role"] or "salesagent",
        member_since=profile["created_at"].strftime("%b %Y"),
        summary=AgentStatSummary(
            chat_count=chat_n,
            video_count=int(video_row["total"] or 0),
            avatar_count=avatar_n,
            cinematic_count=cinematic_n,
            studio_count=studio_n,
            studio_completed=int(studio_row["completed"] or 0),
            studio_failed=int(studio_row["failed"] or 0),
            conversations_count=int(chat_row["conv_count"] or 0),
            estimated_cost_usd=cost_calculator.estimate(chat_n, avatar_n, cinematic_n, studio_n),
        ),
        daily_activity=daily,
        recent_chats=[
            AgentChatMessage(
                id=r["id"],
                content=r["content"][:300],
                timestamp=r["created_at"].isoformat(),
                conversation_id=r["conversation_id"],
            )
            for r in recent_chats_rows
        ],
        recent_videos=[
            AgentVideoEvent(
                id=r["id"],
                mode=r["mode"] or "avatar",
                status=r["status"] or "pending",
                script=r["script"][:200] if r["script"] else "",
                created_at=r["created_at"].isoformat(),
            )
            for r in recent_videos_rows
        ],
        recent_studio=[
            AgentStudioEvent(
                id=r["id"],
                title=r["title"] or "Untitled",
                tool=r["tool"] or "",
                status=r["status"] or "draft",
                created_at=r["created_at"].isoformat(),
            )
            for r in recent_studio_rows
        ],
    )


# ---------------------------------------------------------------------------
# Extended summary (cost, success rate, new agents)
# ---------------------------------------------------------------------------

async def get_extended_summary(range_str: str) -> ExtendedSummary:
    start, end = parse_range(range_str)
    pool = await get_pool()

    async with pool.acquire() as conn:
        # Total cost: sum estimated cost across all active agents
        agents = await get_top_agents(range_str, limit=1000)
        total_cost = round(sum(a.estimated_cost_usd for a in agents), 2)

        # Video success rate
        video_row = await conn.fetchrow(
            """
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed
            FROM videos
            WHERE created_at >= $1 AND created_at < $2
            """,
            start, end,
        )
        total_v = int(video_row["total"] or 0)
        completed_v = int(video_row["completed"] or 0)
        success_rate = round(completed_v / total_v * 100, 1) if total_v > 0 else 0.0

        # New agents: invitations accepted in period
        new_agents = await conn.fetchval(
            """
            SELECT COUNT(*) FROM invitations
            WHERE status = 'accepted'
              AND accepted_at >= $1 AND accepted_at < $2
            """,
            start, end,
        ) or 0

        # Total all-time agents
        total_agents = await conn.fetchval("SELECT COUNT(*) FROM profiles") or 0

    return ExtendedSummary(
        total_cost_usd=total_cost,
        video_success_rate=success_rate,
        new_agents=int(new_agents),
        total_agents=int(total_agents),
    )


# ---------------------------------------------------------------------------
# Top queried projects
# ---------------------------------------------------------------------------

async def get_top_projects(range_str: str, limit: int = 10) -> list[TopProject]:
    start, end = parse_range(range_str)
    pool = await get_pool()

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                p.id AS project_id,
                p.name AS project_name,
                COALESCE(d.name, 'Unknown') AS developer_name,
                p.region,
                COUNT(c.id) AS query_count
            FROM ask_alpha_conversations c
            JOIN projects p ON p.id = c.project_id
            LEFT JOIN developers d ON d.id = p.developer_id
            WHERE c.created_at >= $1 AND c.created_at < $2
              AND c.project_id IS NOT NULL
            GROUP BY p.id, p.name, d.name, p.region
            ORDER BY query_count DESC
            LIMIT $3
            """,
            start, end, limit,
        )

    return [
        TopProject(
            project_id=int(r["project_id"]),
            project_name=r["project_name"] or "Unknown",
            developer_name=r["developer_name"] or "Unknown",
            region=r["region"],
            query_count=int(r["query_count"]),
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Feature adoption
# ---------------------------------------------------------------------------

async def get_feature_adoption(range_str: str) -> FeatureAdoptionResponse:
    start, end = parse_range(range_str)
    pool = await get_pool()

    async with pool.acquire() as conn:
        total_agents = await conn.fetchval("SELECT COUNT(*) FROM profiles") or 1

        chat_agents = await conn.fetchval(
            """
            SELECT COUNT(DISTINCT user_id)
            FROM ask_alpha_conversations
            WHERE created_at >= $1 AND created_at < $2
              AND user_id IS NOT NULL
            """,
            start, end,
        ) or 0

        video_agents = await conn.fetchval(
            """
            SELECT COUNT(DISTINCT requested_by)
            FROM videos
            WHERE created_at >= $1 AND created_at < $2
            """,
            start, end,
        ) or 0

        studio_agents = await conn.fetchval(
            """
            SELECT COUNT(DISTINCT user_id)
            FROM studio_shots
            WHERE created_at >= $1 AND created_at < $2
            """,
            start, end,
        ) or 0

    def pct(n: int) -> float:
        return round(int(n) / int(total_agents) * 100, 1)

    return FeatureAdoptionResponse(
        total_agents=int(total_agents),
        chat_agents=int(chat_agents),
        video_agents=int(video_agents),
        studio_agents=int(studio_agents),
        chat_pct=pct(chat_agents),
        video_pct=pct(video_agents),
        studio_pct=pct(studio_agents),
    )


# ---------------------------------------------------------------------------
# Video pipeline (current state — no date filter)
# ---------------------------------------------------------------------------

async def get_video_pipeline() -> VideoPipelineResponse:
    pool = await get_pool()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                COUNT(*) FILTER (WHERE status = 'pending')    AS pending,
                COUNT(*) FILTER (WHERE status = 'processing') AS processing,
                COUNT(*) FILTER (WHERE status = 'completed')  AS completed,
                COUNT(*) FILTER (WHERE status = 'failed')     AS failed,
                COUNT(*)                                       AS total
            FROM videos
            """
        )

    total = int(row["total"] or 0)
    completed = int(row["completed"] or 0)
    return VideoPipelineResponse(
        pending=int(row["pending"] or 0),
        processing=int(row["processing"] or 0),
        completed=completed,
        failed=int(row["failed"] or 0),
        total=total,
        success_rate=round(completed / total * 100, 1) if total > 0 else 0.0,
    )


# ---------------------------------------------------------------------------
# Retention (weekly unique agents)
# ---------------------------------------------------------------------------

async def get_retention(range_str: str) -> list[RetentionPoint]:
    start, end = parse_range(range_str)
    pool = await get_pool()

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                DATE_TRUNC('week', created_at AT TIME ZONE 'UTC')::date AS week_start,
                COUNT(DISTINCT user_id) AS unique_agents
            FROM ask_alpha_conversations
            WHERE created_at >= $1 AND created_at < $2
              AND user_id IS NOT NULL
            GROUP BY week_start
            ORDER BY week_start
            """,
            start, end,
        )

    return [
        RetentionPoint(week=str(r["week_start"]), unique_agents=int(r["unique_agents"]))
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Hourly heatmap (activity by hour × day-of-week, Dubai time UTC+4)
# ---------------------------------------------------------------------------

async def get_hourly_heatmap(range_str: str) -> list[HeatmapCell]:
    start, end = parse_range(range_str)
    pool = await get_pool()

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                EXTRACT(DOW  FROM created_at AT TIME ZONE 'Asia/Dubai')::int AS dow,
                EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Dubai')::int AS hour,
                COUNT(*) AS cnt
            FROM ask_alpha_conversations
            WHERE created_at >= $1 AND created_at < $2
            GROUP BY dow, hour
            ORDER BY dow, hour
            """,
            start, end,
        )

    return [
        HeatmapCell(dow=int(r["dow"]), hour=int(r["hour"]), count=int(r["cnt"]))
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Cost trend (daily estimated cost)
# ---------------------------------------------------------------------------

async def get_cost_trend(range_str: str) -> list[DailyCostPoint]:
    start, end = parse_range(range_str)
    pool = await get_pool()

    async with pool.acquire() as conn:
        chat_rows = await conn.fetch(
            """
            SELECT DATE(c.created_at AT TIME ZONE 'UTC') AS day, COUNT(m.id) AS cnt
            FROM ask_alpha_messages m
            JOIN ask_alpha_conversations c ON c.id = m.conversation_id
            WHERE m.role = 'user' AND c.created_at >= $1 AND c.created_at < $2
            GROUP BY day
            """,
            start, end,
        )
        video_rows = await conn.fetch(
            """
            SELECT DATE(created_at AT TIME ZONE 'UTC') AS day,
                   COUNT(*) FILTER (WHERE mode = 'avatar')    AS avatar,
                   COUNT(*) FILTER (WHERE mode = 'cinematic') AS cinematic
            FROM videos WHERE created_at >= $1 AND created_at < $2
            GROUP BY day
            """,
            start, end,
        )
        studio_rows = await conn.fetch(
            """
            SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS cnt
            FROM studio_shots WHERE created_at >= $1 AND created_at < $2
            GROUP BY day
            """,
            start, end,
        )

    chat_map   = {str(r["day"]): int(r["cnt"]) for r in chat_rows}
    avatar_map = {str(r["day"]): int(r["avatar"]) for r in video_rows}
    cin_map    = {str(r["day"]): int(r["cinematic"]) for r in video_rows}
    studio_map = {str(r["day"]): int(r["cnt"]) for r in studio_rows}

    from datetime import timedelta
    points: list[DailyCostPoint] = []
    current = start.date()
    while current <= end.date():
        key = str(current)
        cost = cost_calculator.estimate(
            chat_count=chat_map.get(key, 0),
            avatar_count=avatar_map.get(key, 0),
            cinematic_count=cin_map.get(key, 0),
            studio_count=studio_map.get(key, 0),
        )
        points.append(DailyCostPoint(date=key, estimated_cost_usd=cost))
        current += timedelta(days=1)

    return points


# ---------------------------------------------------------------------------
# Export (CSV)
# ---------------------------------------------------------------------------

async def get_export_csv(range_str: str) -> str:
    agents = await get_top_agents(range_str)
    lines = ["agent_id,name,email,role,chat_count,video_count,studio_count,estimated_cost_usd"]
    for a in agents:
        lines.append(
            f'{a.agent_id},"{a.name}",{a.email},{a.role},'
            f'{a.chat_count},{a.video_count},{a.studio_count},{a.estimated_cost_usd}'
        )
    return "\n".join(lines)
