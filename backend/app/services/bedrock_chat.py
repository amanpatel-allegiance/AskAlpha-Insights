"""
Bedrock-powered NL-to-SQL chat for AskAlpha analytics dashboard.

Flow:
  1. User question → Phase 1 (Bedrock): generate safe SELECT query
  2. Validate + execute SQL against Postgres
  3. Phase 2 (Bedrock): format raw results into friendly natural language
  4. Return formatted answer to frontend

Falls back to a helpful error message if Bedrock is not configured.
"""

import json
import asyncio
import re
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import boto3
from botocore.exceptions import ClientError

from app.config import settings
from app.db.client import get_pool

log = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=4)

# ---------------------------------------------------------------------------
# Schema context — only analytics-relevant tables
# ---------------------------------------------------------------------------

SCHEMA_CONTEXT = """
### profiles — Platform users / agents
  id uuid PK
  email text
  role text  — 'admin' | 'salesagent'
  first_name text, last_name text
  created_at timestamptz
  ask_alpha_access text

### ask_alpha_conversations — AI chat sessions
  id uuid PK
  user_id uuid → profiles.id
  title text
  project_id bigint (nullable) → projects.id
  created_at timestamptz, updated_at timestamptz

### ask_alpha_messages — Individual chat messages
  id bigint PK
  conversation_id uuid → ask_alpha_conversations.id
  role text  — 'user' (agent prompt) | 'assistant' (AI response)
  content text
  created_at timestamptz

### videos — AI video generation jobs
  id uuid PK
  requested_by uuid → profiles.id
  mode text  — 'avatar' | 'cinematic'
  status text  — 'pending' | 'processing' | 'completed' | 'failed'
  script text
  created_at timestamptz, completed_at timestamptz (nullable)

### studio_shots — Video studio / editing jobs
  id uuid PK
  user_id uuid → profiles.id
  tool text, title text
  status text  — 'draft' | 'completed' | 'failed'
  created_at timestamptz

### invitations — Agent onboarding
  id uuid PK
  email text, role text
  status text  — 'pending' | 'accepted' | 'revoked'
  accepted_at timestamptz (nullable)
  created_at timestamptz, expires_at timestamptz
"""

# ---------------------------------------------------------------------------
# Few-shot examples (question → SQL)
# ---------------------------------------------------------------------------

FEW_SHOT_EXAMPLES = """
Q: Who are the most active agents today?
SQL:
SELECT
    COALESCE(p.first_name || ' ' || p.last_name, p.email) AS agent_name,
    p.role,
    COUNT(m.id) AS messages
FROM ask_alpha_messages m
JOIN ask_alpha_conversations c ON c.id = m.conversation_id
JOIN profiles p ON p.id = c.user_id
WHERE m.role = 'user'
  AND c.created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Dubai') AT TIME ZONE 'Asia/Dubai'
GROUP BY p.id, agent_name, p.role
ORDER BY messages DESC
LIMIT 10

Q: How many videos were generated this week?
SQL:
SELECT
    COUNT(*)                                              AS total_videos,
    COUNT(*) FILTER (WHERE mode = 'avatar')               AS avatar,
    COUNT(*) FILTER (WHERE mode = 'cinematic')            AS cinematic,
    COUNT(*) FILTER (WHERE status = 'completed')          AS completed,
    COUNT(*) FILTER (WHERE status = 'failed')             AS failed,
    ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric
          / NULLIF(COUNT(*), 0) * 100, 1)                AS success_rate_pct
FROM videos
WHERE created_at >= NOW() - INTERVAL '7 days'

Q: What is the chat volume per day over the last 7 days?
SQL:
SELECT
    DATE(c.created_at AT TIME ZONE 'Asia/Dubai') AS day,
    COUNT(m.id) AS messages
FROM ask_alpha_messages m
JOIN ask_alpha_conversations c ON c.id = m.conversation_id
WHERE m.role = 'user'
  AND c.created_at >= NOW() - INTERVAL '7 days'
GROUP BY day
ORDER BY day

Q: Which agent has sent the most messages in the last 30 days?
SQL:
SELECT
    COALESCE(p.first_name || ' ' || p.last_name, p.email) AS agent_name,
    p.role,
    COUNT(m.id) AS total_messages
FROM ask_alpha_messages m
JOIN ask_alpha_conversations c ON c.id = m.conversation_id
JOIN profiles p ON p.id = c.user_id
WHERE m.role = 'user'
  AND c.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id, agent_name, p.role
ORDER BY total_messages DESC
LIMIT 1

Q: What is the studio job completion rate this month?
SQL:
SELECT
    COUNT(*)                                            AS total_jobs,
    COUNT(*) FILTER (WHERE status = 'completed')        AS completed,
    COUNT(*) FILTER (WHERE status = 'failed')           AS failed,
    COUNT(*) FILTER (WHERE status = 'draft')            AS in_progress,
    ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric
          / NULLIF(COUNT(*), 0) * 100, 1)              AS completion_rate_pct
FROM studio_shots
WHERE created_at >= DATE_TRUNC('month', NOW())

Q: How many agents have been onboarded in the last 30 days?
SQL:
SELECT
    COUNT(*) FILTER (WHERE status = 'accepted') AS onboarded,
    COUNT(*) FILTER (WHERE status = 'pending')  AS pending_invites,
    COUNT(*) FILTER (WHERE status = 'revoked')  AS revoked
FROM invitations
WHERE created_at >= NOW() - INTERVAL '30 days'

Q: What are the peak usage hours for chat?
SQL:
SELECT
    EXTRACT(HOUR FROM c.created_at AT TIME ZONE 'Asia/Dubai')::int AS hour_gst,
    COUNT(m.id) AS messages
FROM ask_alpha_messages m
JOIN ask_alpha_conversations c ON c.id = m.conversation_id
WHERE m.role = 'user'
  AND c.created_at >= NOW() - INTERVAL '30 days'
GROUP BY hour_gst
ORDER BY messages DESC
LIMIT 5

Q: How many total agents are on the platform?
SQL:
SELECT
    COUNT(*)                                     AS total_agents,
    COUNT(*) FILTER (WHERE role = 'admin')       AS admins,
    COUNT(*) FILTER (WHERE role = 'salesagent')  AS sales_agents
FROM profiles

Q: Who generated videos today? / Which user generated a video? / Who has generated this video?
SQL:
SELECT
    COALESCE(p.first_name || ' ' || p.last_name, p.email) AS agent_name,
    p.role,
    v.mode,
    v.status,
    v.created_at
FROM videos v
JOIN profiles p ON p.id = v.requested_by
WHERE v.created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Dubai') AT TIME ZONE 'Asia/Dubai'
ORDER BY v.created_at DESC
LIMIT 20

Q: Give me the list of users who generated videos today
SQL:
SELECT
    COALESCE(p.first_name || ' ' || p.last_name, p.email) AS agent_name,
    p.role,
    COUNT(v.id)                                            AS videos_count,
    COUNT(v.id) FILTER (WHERE v.mode = 'avatar')           AS avatar_count,
    COUNT(v.id) FILTER (WHERE v.mode = 'cinematic')        AS cinematic_count
FROM videos v
JOIN profiles p ON p.id = v.requested_by
WHERE v.created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Dubai') AT TIME ZONE 'Asia/Dubai'
GROUP BY p.id, agent_name, p.role
ORDER BY videos_count DESC
LIMIT 20

Q: Who generated the most recent video?
SQL:
SELECT
    COALESCE(p.first_name || ' ' || p.last_name, p.email) AS agent_name,
    p.role,
    v.mode,
    v.status,
    v.created_at
FROM videos v
JOIN profiles p ON p.id = v.requested_by
ORDER BY v.created_at DESC
LIMIT 1

Q: Who generated the least videos this week? / Who generated the fewest videos?
SQL:
WITH video_counts AS (
    SELECT
        p.id,
        COALESCE(p.first_name || ' ' || p.last_name, p.email) AS agent_name,
        p.role,
        COUNT(v.id)                                            AS videos_count,
        COUNT(v.id) FILTER (WHERE v.mode = 'avatar')           AS avatar_count,
        COUNT(v.id) FILTER (WHERE v.mode = 'cinematic')        AS cinematic_count
    FROM videos v
    JOIN profiles p ON p.id = v.requested_by
    WHERE v.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY p.id, agent_name, p.role
)
SELECT agent_name, role, videos_count, avatar_count, cinematic_count
FROM video_counts
WHERE videos_count = (SELECT MIN(videos_count) FROM video_counts)
ORDER BY agent_name
LIMIT 50

Q: Who generated the most videos this week? / Who is the top video creator?
SQL:
WITH video_counts AS (
    SELECT
        p.id,
        COALESCE(p.first_name || ' ' || p.last_name, p.email) AS agent_name,
        p.role,
        COUNT(v.id)                                            AS videos_count,
        COUNT(v.id) FILTER (WHERE v.mode = 'avatar')           AS avatar_count,
        COUNT(v.id) FILTER (WHERE v.mode = 'cinematic')        AS cinematic_count
    FROM videos v
    JOIN profiles p ON p.id = v.requested_by
    WHERE v.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY p.id, agent_name, p.role
)
SELECT agent_name, role, videos_count, avatar_count, cinematic_count
FROM video_counts
WHERE videos_count = (SELECT MAX(videos_count) FROM video_counts)
ORDER BY agent_name
LIMIT 50

Q: Who sent the least/fewest chat messages this week?
SQL:
WITH msg_counts AS (
    SELECT
        p.id,
        COALESCE(p.first_name || ' ' || p.last_name, p.email) AS agent_name,
        p.role,
        COUNT(m.id) AS message_count
    FROM ask_alpha_messages m
    JOIN ask_alpha_conversations c ON c.id = m.conversation_id
    JOIN profiles p ON p.id = c.user_id
    WHERE m.role = 'user'
      AND c.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY p.id, agent_name, p.role
)
SELECT agent_name, role, message_count
FROM msg_counts
WHERE message_count = (SELECT MIN(message_count) FROM msg_counts)
ORDER BY agent_name
LIMIT 50

Q: Show me all studio jobs done today and who did them
SQL:
SELECT
    COALESCE(p.first_name || ' ' || p.last_name, p.email) AS agent_name,
    s.title,
    s.tool,
    s.status,
    s.created_at
FROM studio_shots s
JOIN profiles p ON p.id = s.user_id
WHERE s.created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Dubai') AT TIME ZONE 'Asia/Dubai'
ORDER BY s.created_at DESC
LIMIT 20
"""

# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

SQL_SYSTEM_PROMPT = f"""You are AskAlpha Analytics — an internal data assistant for Allegiance Real Estate leadership.
Your only job is to convert natural language questions into safe PostgreSQL SELECT queries.

## Database Schema
{SCHEMA_CONTEXT}

## Few-shot Examples
{FEW_SHOT_EXAMPLES}

## CRITICAL OUTPUT RULES — follow exactly
- Your ENTIRE response must be the raw SQL query and nothing else.
- Do NOT wrap in markdown fences (no ```sql, no ```).
- Do NOT write any explanation, preamble, or comments before or after the SQL.
- Start your response with the word SELECT or WITH — nothing before it.
- Only SELECT statements. Never write INSERT / UPDATE / DELETE / DROP / ALTER / CREATE / TRUNCATE.
- Always include LIMIT (default 20, max 100).
- Agent display name: COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown')
- Count only messages where role = 'user' as agent prompts (role = 'assistant' is the AI).
- Dubai time zone is 'Asia/Dubai' (UTC+4). Use for hour-level and "today" queries.
- "Today" means since midnight Dubai time:
  created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Dubai') AT TIME ZONE 'Asia/Dubai'
- If the question refers to "this video", "that agent", or similar follow-up context you cannot resolve,
  default to querying TODAY's data for that entity type (videos today, agents today, etc.).
- Only reply CANNOT_ANSWER: <reason> if the question is truly outside the schema (e.g. asking about
  pricing, property listings, external systems). For any usage-related question, always attempt a query.
- TIES — most/least/highest/lowest: NEVER use LIMIT 1 for these. Use a subquery to find the
  min/max value, then return ALL rows matching that value. Multiple people may be tied.
  Pattern: WHERE count_col = (SELECT MIN(count_col) FROM cte) — always show all tied results.
"""

FORMAT_SYSTEM_PROMPT = """You are a concise analytics assistant for Allegiance Real Estate senior leadership.
You will be given a user question, the SQL that was executed, and the raw query results.
Write a clear, brief natural-language response. Rules:
- Use PLAIN TEXT only — no asterisks, no markdown, no ** bold **, no backticks
- Lead with the key number or finding on the first line
- For lists, use a simple dash and space:  - Item name: value
- Format numbers with commas (e.g. 1,234)
- Percentages to 1 decimal place (e.g. 84.3%)
- If results are empty, clearly state no data was found for that period
- No SQL jargon, no technical details
- Keep it under 200 words
- TIES: If multiple rows share the same min or max value, list ALL of them — never pick just one.
  Example: "3 agents are tied for the least with 1 video each: Name A, Name B, Name C."
  Never say "the agent who generated the least" if multiple agents share that count.
"""

# ---------------------------------------------------------------------------
# Bedrock client (lazy-initialised)
# ---------------------------------------------------------------------------

_bedrock_client = None


def _get_client():
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
    return _bedrock_client


def _invoke_sync(system: str, messages: list[dict], max_tokens: int = 512) -> str:
    client = _get_client()
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "system": system,
        "messages": messages,
    })
    resp = client.invoke_model(modelId=settings.bedrock_model_id, body=body)
    data = json.loads(resp["body"].read())
    return data["content"][0]["text"].strip()


async def _invoke(system: str, messages: list[dict], max_tokens: int = 512) -> str:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor,
        lambda: _invoke_sync(system, messages, max_tokens),
    )


# ---------------------------------------------------------------------------
# SQL extractor — strips markdown fences and preamble that Haiku sometimes adds
# ---------------------------------------------------------------------------

def _extract_sql(raw: str) -> str:
    """
    Claude sometimes wraps SQL in ```sql ... ``` despite instructions.
    Try three strategies in order:
      1. Extract content from a markdown code fence
      2. Find the first SELECT or WITH keyword and take everything from there
      3. Return the raw text as-is (validator will then reject it cleanly)
    """
    # Strategy 1: markdown fence  ```sql ... ```  or  ``` ... ```
    fence = re.search(r"```(?:sql)?\s*\n?(.*?)```", raw, re.DOTALL | re.IGNORECASE)
    if fence:
        return fence.group(1).strip()

    # Strategy 2: find the first SELECT / WITH and take everything from there
    kw = re.search(r"\b(SELECT|WITH)\b", raw, re.IGNORECASE)
    if kw:
        return raw[kw.start():].strip()

    # Strategy 3: return as-is — _validate_sql will produce a clear error
    return raw.strip()


# ---------------------------------------------------------------------------
# SQL safety validator
# ---------------------------------------------------------------------------

_DANGEROUS = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXECUTE|EXEC|COPY)\b",
    re.IGNORECASE,
)


def _validate_sql(sql: str) -> tuple[bool, str]:
    sql_stripped = sql.strip().upper()
    if not (sql_stripped.startswith("SELECT") or sql_stripped.startswith("WITH")):
        return False, "Query must start with SELECT or WITH."
    if _DANGEROUS.search(sql):
        return False, "Query contains disallowed operations."
    return True, ""


def _ensure_limit(sql: str, max_rows: int = 100) -> str:
    """Append LIMIT if not already present."""
    if re.search(r"\bLIMIT\b", sql, re.IGNORECASE):
        return sql
    return sql.rstrip().rstrip(";") + f"\nLIMIT {max_rows}"


# ---------------------------------------------------------------------------
# Result formatter (raw → readable text for Phase 2)
# ---------------------------------------------------------------------------

def _format_records(records: list[dict[str, Any]]) -> str:
    if not records:
        return "(no rows returned)"
    cols = list(records[0].keys())
    lines = [" | ".join(cols)]
    lines.append("-" * len(lines[0]))
    for row in records[:50]:  # cap at 50 rows for context window
        lines.append(" | ".join(str(v) if v is not None else "—" for v in row.values()))
    if len(records) > 50:
        lines.append(f"… and {len(records) - 50} more rows")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def chat(
    question: str,
    range_str: str = "7d",
    history: list[dict] | None = None,
) -> str:
    if not settings.bedrock_enabled:
        return (
            "Bedrock is not configured. Add AWS_ACCESS_KEY_ID and "
            "AWS_SECRET_ACCESS_KEY to your backend .env file."
        )

    # Build message list — include last 6 history turns so Claude has context
    # for follow-up questions like "who generated this video?"
    prior = (history or [])[-6:]
    messages = [*prior, {"role": "user", "content": question}]

    # ── Phase 1: Generate SQL ────────────────────────────────────────────────
    try:
        sql_raw = await _invoke(
            system=SQL_SYSTEM_PROMPT,
            messages=messages,
            max_tokens=600,
        )
    except ClientError as e:
        log.error("Bedrock Phase 1 error: %s", e)
        return f"AI service error: {e.response['Error']['Message']}"
    except Exception as e:
        log.error("Bedrock Phase 1 unexpected error: %s", e)
        return "AI service temporarily unavailable. Please try again."

    # Handle CANNOT_ANSWER — only when it's the entire response, not buried in SQL text
    if sql_raw.strip().upper().startswith("CANNOT_ANSWER:"):
        reason = sql_raw.split(":", 1)[-1].strip()
        return (
            f"I can't answer that with the current data: {reason}\n\n"
            "Try asking about agents, chat messages, videos, studio jobs, or costs."
        )

    # Strip markdown fences / preamble that Haiku sometimes adds
    sql_raw = _extract_sql(sql_raw)
    log.debug("Extracted SQL: %s", sql_raw[:200])

    # ── Validate SQL ─────────────────────────────────────────────────────────
    ok, err = _validate_sql(sql_raw)
    if not ok:
        log.warning("Unsafe SQL rejected: %s | error: %s", sql_raw, err)
        return f"The generated query was rejected for safety: {err}"

    sql = _ensure_limit(sql_raw)

    # ── Execute SQL ──────────────────────────────────────────────────────────
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(sql)
        records = [dict(r) for r in rows]
    except Exception as e:
        log.error("SQL execution error: %s\nSQL: %s", e, sql)
        return (
            f"The query ran into a database error: {e}\n\n"
            "Try rephrasing your question."
        )

    # ── Phase 2: Format results ───────────────────────────────────────────────
    results_text = _format_records(records)
    format_prompt = (
        f"Question: {question}\n\n"
        f"SQL executed:\n{sql}\n\n"
        f"Results ({len(records)} rows):\n{results_text}"
    )

    try:
        answer = await _invoke(
            system=FORMAT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": format_prompt}],
            max_tokens=400,
        )
    except Exception as e:
        log.error("Bedrock Phase 2 error: %s", e)
        # Fall back to raw formatted results
        answer = f"Query returned {len(records)} rows:\n\n{results_text}"

    return answer
