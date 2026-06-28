import type {
  Summary, ExtendedSummary,
  DailyActivityPoint, TopAgent, ActivityEvent, AgentDetail,
  TopProject, FeatureAdoption, VideoPipeline,
  RetentionPoint, HeatmapCell, DailyCostPoint,
  DateRange, RoleFilter, FeatureFilter,
} from "@/types";

// Empty string = relative URLs. Next.js rewrites in next.config.js proxy
// /api/* → backend server-to-server, so the browser never touches the backend
// directly. This prevents mixed-content blocks (HTTPS page → HTTP backend).
const BASE = "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  // Core
  summary: (range: DateRange, role: RoleFilter = "all") =>
    get<Summary>(`/api/usage/summary?range=${range}&role=${role}`),

  extendedSummary: (range: DateRange) =>
    get<ExtendedSummary>(`/api/usage/extended-summary?range=${range}`),

  dailyActivity: (range: DateRange, feature: FeatureFilter = "all") =>
    get<DailyActivityPoint[]>(`/api/usage/daily-activity?range=${range}&feature=${feature}`),

  topAgents: (range: DateRange, role: RoleFilter = "all") =>
    get<TopAgent[]>(`/api/usage/top-agents?range=${range}&limit=10&role=${role}`),

  recentActivity: (range: DateRange, role: RoleFilter = "all", feature: FeatureFilter = "all") =>
    get<ActivityEvent[]>(`/api/usage/recent-activity?range=${range}&limit=50&role=${role}&feature=${feature}`),

  agentDetail: (agentId: string, range: DateRange) =>
    get<AgentDetail>(`/api/usage/agent/${agentId}?range=${range}`),

  // New analytics
  topProjects: (range: DateRange) =>
    get<TopProject[]>(`/api/usage/top-projects?range=${range}&limit=10`),

  featureAdoption: (range: DateRange) =>
    get<FeatureAdoption>(`/api/usage/feature-adoption?range=${range}`),

  videoPipeline: () =>
    get<VideoPipeline>(`/api/usage/video-pipeline`),

  retention: (range: DateRange) =>
    get<RetentionPoint[]>(`/api/usage/retention?range=${range}`),

  hourlyHeatmap: (range: DateRange) =>
    get<HeatmapCell[]>(`/api/usage/hourly-heatmap?range=${range}`),

  costTrend: (range: DateRange) =>
    get<DailyCostPoint[]>(`/api/usage/cost-trend?range=${range}`),

  // Chat
  chat: (
    message: string,
    range: DateRange,
    history: Array<{ role: string; content: string }> = [],
  ): Promise<{ reply: string }> =>
    fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, range, history }),
    }).then((r) => {
      if (!r.ok) throw new Error(`Chat API returned ${r.status}`);
      return r.json();
    }),

  exportUrl: (range: DateRange) =>
    `${BASE}/api/usage/export?range=${range}`,
};
