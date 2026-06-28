export type DateRange = "1d" | "7d" | "30d" | "this_month";
export type RoleFilter = "all" | "admin" | "salesagent";
export type FeatureFilter = "all" | "chat" | "video" | "studio";

export interface DeltaValue {
  value: number;
  pct: number | null;
}

export interface Summary {
  active_agents: number;
  chat_messages: number;
  videos_generated: number;
  avatar_videos: number;
  cinematic_videos: number;
  studio_jobs: number;
  studio_completed: number;
  studio_failed: number;
  deltas: {
    active_agents: DeltaValue;
    chat_messages: DeltaValue;
    videos_generated: DeltaValue;
    studio_jobs: DeltaValue;
  };
}

export interface ExtendedSummary {
  total_cost_usd: number;
  video_success_rate: number;
  new_agents: number;
  total_agents: number;
}

export interface DailyActivityPoint {
  date: string;
  chat: number;
  video: number;
  studio: number;
}

export interface TopAgent {
  agent_id: string;
  name: string;
  email: string;
  role: string;
  chat_count: number;
  video_count: number;
  studio_count: number;
  estimated_cost_usd: number;
}

export interface ActivityEvent {
  id: string;
  feature: "chat" | "video" | "studio";
  agent_name: string;
  timestamp: string;
  status: "completed" | "processing" | "failed" | "pending" | "draft";
  prompt: string;
}

export interface TopProject {
  project_id: number;
  project_name: string;
  developer_name: string;
  region: string | null;
  query_count: number;
}

export interface FeatureAdoption {
  total_agents: number;
  chat_agents: number;
  video_agents: number;
  studio_agents: number;
  chat_pct: number;
  video_pct: number;
  studio_pct: number;
}

export interface VideoPipeline {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  success_rate: number;
}

export interface RetentionPoint {
  week: string;
  unique_agents: number;
}

export interface HeatmapCell {
  dow: number;
  hour: number;
  count: number;
}

export interface DailyCostPoint {
  date: string;
  estimated_cost_usd: number;
}

// ── Agent detail ─────────────────────────────────────────────────────────────

export interface AgentStatSummary {
  chat_count: number;
  video_count: number;
  avatar_count: number;
  cinematic_count: number;
  studio_count: number;
  studio_completed: number;
  studio_failed: number;
  conversations_count: number;
  estimated_cost_usd: number;
}

export interface AgentChatMessage {
  id: string;
  content: string;
  timestamp: string;
  conversation_id: string;
}

export interface AgentVideoEvent {
  id: string;
  mode: string;
  status: string;
  script: string;
  created_at: string;
}

export interface AgentStudioEvent {
  id: string;
  title: string;
  tool: string;
  status: string;
  created_at: string;
}

export interface AgentDetail {
  agent_id: string;
  name: string;
  email: string;
  role: string;
  member_since: string;
  summary: AgentStatSummary;
  daily_activity: DailyActivityPoint[];
  recent_chats: AgentChatMessage[];
  recent_videos: AgentVideoEvent[];
  recent_studio: AgentStudioEvent[];
}
