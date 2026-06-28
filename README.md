# AskAlpha Usage Dashboard

Internal analytics dashboard for **AskAlpha** — Allegiance Real Estate's AI product for Dubai and Abu Dhabi agents.

Provides leadership visibility into:
- Agent adoption and activity
- Chat / prompt volume
- Video generation (avatar + cinematic)
- Studio job throughput
- Estimated cost per agent

---

## Project structure

```
askalpha-usage-dashboard/
  frontend/          Next.js 14 + TypeScript + Tailwind + Recharts
  backend/           FastAPI + asyncpg (Supabase Postgres)
  SCHEMA_MAPPING.md  Which tables map to which metrics
  README.md
```

---

## Backend setup

### Requirements

- Python 3.11+
- Supabase project with the AskAlpha schema

### Install

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Configure

```bash
cp .env.example .env
# Fill in DATABASE_URL and SUPABASE_* values
```

Required env vars:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string from Supabase (Settings → Database → Connection string) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (never expose to frontend) |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins |
| `CHAT_COST_PER_MESSAGE` | USD cost per chat message (default: 0.002) |
| `AVATAR_VIDEO_COST` | USD cost per avatar video (default: 0.50) |
| `CINEMATIC_VIDEO_COST` | USD cost per cinematic video (default: 1.20) |
| `STUDIO_JOB_COST` | USD cost per studio job (default: 0.25) |

### Run

```bash
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

---

## Frontend setup

### Requirements

- Node.js 18+

### Install

```bash
cd frontend
npm install
```

### Configure

```bash
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL to your backend URL
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g. http://localhost:8000) |

### Run

```bash
npm run dev
```

Dashboard: http://localhost:3000/dashboard/usage

---

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Health check |
| `GET /api/usage/summary?range=7d` | KPI summary with deltas |
| `GET /api/usage/daily-activity?range=7d` | Stacked chart data |
| `GET /api/usage/top-agents?range=7d` | Agent leaderboard |
| `GET /api/usage/recent-activity?range=7d` | Activity feed |
| `GET /api/usage/export?range=7d` | CSV export |

Supported range values: `7d`, `30d`, `this_month`

---

## Supabase connection

The backend connects directly to Supabase Postgres via `asyncpg` using the `DATABASE_URL`. This is more efficient than using the Supabase client for aggregate queries.

Get your connection string from: **Supabase Dashboard → Project Settings → Database → Connection string (URI mode)**

Use the **service role** for backend queries so RLS policies don't block admin-level reads.

---

## Metrics: what's tracked vs estimated

| Metric | Status | Source |
|---|---|---|
| Active agents | Real | `ask_alpha_conversations.user_id` |
| Chat messages | Real | `ask_alpha_messages` (role=user) |
| Videos generated | Real | `videos` table |
| Avatar vs cinematic split | Real | `videos.mode` |
| Studio jobs | Real | `studio_shots` |
| Studio completed / failed | Real | `studio_shots.status` |
| Estimated cost | Estimated | Rate × count (no token log yet) |
| Prompt text in activity | Real (partial) | `ask_alpha_messages.content`, `videos.script`, `studio_shots.title` |
| Social post generation | Not tracked | No table yet |
| Brochure generation | Not tracked | No table yet |

See [SCHEMA_MAPPING.md](./SCHEMA_MAPPING.md) for full details.

---

## Production deployment notes

- Set `ALLOWED_ORIGINS` to your internal domain only
- Never set `NEXT_PUBLIC_API_URL` to expose the Supabase service role — the backend is the only consumer of that key
- Use a reverse proxy (nginx, Caddy) to serve both frontend and backend on the same domain
- Backend is stateless and can be deployed to any Python host (Railway, Render, Fly.io)
- Frontend deploys to Vercel, Netlify, or any Node host
