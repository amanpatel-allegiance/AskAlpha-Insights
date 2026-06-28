# Schema Mapping — AskAlpha Usage Dashboard

## Overview

This document maps each dashboard metric to the actual Supabase Postgres tables and columns used in queries.

---

## Users / Agents

**Table:** `public.profiles`

| Field | Column |
|---|---|
| Agent ID | `id` (uuid) |
| Email | `email` |
| First name | `first_name` |
| Last name | `last_name` |
| Role | `role` — values: `admin`, `salesagent` |
| Access level | `ask_alpha_access` — custom enum |
| Created | `created_at` |

**Notes:**
- The role enum only has `admin` and `salesagent`. The dashboard shows these as "Admin" and "Agent". A "Manager" tier does not exist in the current schema and is excluded from role badges.
- Display name is built as `first_name || ' ' || last_name`. Falls back to `email` prefix if both are null.

---

## Chat Usage

**Tables:** `public.ask_alpha_conversations`, `public.ask_alpha_messages`

| Metric | Source |
|---|---|
| Active agents (chat) | `DISTINCT user_id` on `ask_alpha_conversations` in period |
| Total chat messages | `COUNT(*)` on `ask_alpha_messages` WHERE `role = 'user'` joined to conversations in period |
| Prompt text | `ask_alpha_messages.content` WHERE `role = 'user'` |
| Conversation timestamp | `ask_alpha_conversations.created_at` |
| Message timestamp | `ask_alpha_messages.created_at` |

**Notes:**
- Only `role = 'user'` messages count as agent prompts. `role = 'assistant'` rows are AI responses and are excluded from counts.
- `ask_alpha_conversations.user_id` links to `profiles.id`.
- `project_id` on conversations is available but optional — a conversation may not be scoped to a project.

---

## Video Generation

**Table:** `public.videos`

| Metric | Column |
|---|---|
| Video ID | `id` |
| Requested by (agent) | `requested_by` → `profiles.id` |
| Status | `status` — values: `pending`, `processing`, `completed`, `failed` |
| Mode / type | `mode` — values: `avatar`, `cinematic` (default: `avatar`) |
| Created at | `created_at` |
| Completed at | `completed_at` |
| Script / prompt | `script` |

**Notes:**
- "Videos generated" = all rows in period (any status, unless you want to count only completed).
- Avatar videos = `WHERE mode = 'avatar'`.
- Cinematic videos = `WHERE mode = 'cinematic'`.
- The `script` column is used as the activity feed prompt text for video events.
- Token-level cost is **not tracked** in the current schema. Estimated cost is computed by `cost_calculator.py` using configurable per-video rates.

---

## Studio Jobs

**Table:** `public.studio_shots`

| Metric | Column |
|---|---|
| Job ID | `id` |
| Agent | `user_id` → `profiles.id` |
| Tool | `tool` |
| Title | `title` |
| Status | `status` — values: `draft`, `completed`, `failed`, and others |
| Created | `created_at` |
| Updated | `updated_at` |

**Supporting table:** `public.studio_steps` — individual pipeline steps per shot. Not aggregated at dashboard level but available for drill-down.

**Notes:**
- "Studio jobs" = count of `studio_shots` rows.
- "Completed" = `WHERE status = 'completed'`.
- "Failed" = `WHERE status = 'failed'`.
- The `title` column is used as the activity feed prompt/action text for studio events.

---

## Social Media Content

**No dedicated activity-tracking table exists** for social post generation. The following tables exist but track connections/accounts, not individual generation events:

- `public.social_connections` — OAuth tokens per provider
- `public.ayrshare_profiles` — Ayrshare integration

**Missing:** A `social_posts` or `social_generation_events` table would be needed to track social content creation activity.

**Current handling:** Social content is not surfaced as a separate metric. It could appear in chat activity if agents used the chat interface to generate social content (prompt text would reveal intent).

---

## Cost Calculation

**No cost/token log table exists** in the current schema.

Estimated cost is computed server-side in `backend/app/services/cost_calculator.py` using:

| Category | Rate source |
|---|---|
| Chat messages | `CHAT_COST_PER_MESSAGE` env var |
| Avatar video | `AVATAR_VIDEO_COST` env var |
| Cinematic video | `CINEMATIC_VIDEO_COST` env var |
| Studio job | `STUDIO_JOB_COST` env var |

**To track real cost:** Add a `usage_cost_log` table with columns: `user_id`, `feature` (chat/avatar/cinematic/studio), `event_id`, `cost_usd`, `created_at`. The cost calculator will then sum real values instead of estimating.

---

## Missing / Pending Fields

| Dashboard Feature | Status | What's Needed |
|---|---|---|
| Prompt text in activity feed | Available for chat (messages.content) and video (videos.script) | Studio: `studio_shots.title` used as fallback — no raw prompt field |
| Token-level AI cost | Not tracked | Add `llm_usage_log` table with `prompt_tokens`, `completion_tokens`, `model`, `cost_usd` |
| Social post generation events | Not tracked | Add `social_posts` table |
| Brochure generation events | Not tracked | Add `brochure_jobs` table |
| Agent last active timestamp | Derived from max(created_at) across tables | Could add `profiles.last_active_at` and update via trigger |
| Manager role | Not in schema | `profiles.role` only has `admin` / `salesagent` |
