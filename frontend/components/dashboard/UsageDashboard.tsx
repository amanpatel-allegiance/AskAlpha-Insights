"use client";

import { useState, useEffect } from "react";
import {
  Users, MessageSquare, Video, Clapperboard,
  DollarSign, CheckCircle2, UserPlus,
} from "lucide-react";
import type {
  DateRange, RoleFilter, FeatureFilter,
  Summary, ExtendedSummary, DailyActivityPoint,
  TopAgent, ActivityEvent, AgentDetail,
  FeatureAdoption, VideoPipeline,
  RetentionPoint, HeatmapCell, DailyCostPoint,
} from "@/types";
import { api } from "@/lib/api";

import { Sidebar }              from "./Sidebar";
import { DateRangeSelect }      from "./DateRangeSelect";
import { FilterSelect }         from "./FilterSelect";
import { ExportButton }         from "./ExportButton";
import { MetricCard }           from "./MetricCard";
import { DailyActivityChart }   from "./DailyActivityChart";
import { TopAgentsTable }       from "./TopAgentsTable";
import { RecentActivityFeed }   from "./RecentActivityFeed";
import { AgentDetailDrawer }    from "./AgentDetailDrawer";
// TopProjectsChart intentionally excluded — no project-scoped data yet
import { FeatureAdoptionChart } from "./FeatureAdoptionChart";
import { VideoPipelineDonut }   from "./VideoPipelineDonut";
import { RetentionChart }       from "./RetentionChart";
import { HourlyHeatmap }        from "./HourlyHeatmap";
import { CostTrendChart }       from "./CostTrendChart";

interface FetchState<T> { data: T | null; loading: boolean; error: string | null }

function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[]): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch((err)  => { if (!cancelled) setState({ data: null, loading: false, error: err.message }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

const ROLE_OPTIONS: { value: RoleFilter; label: string }[]    = [
  { value: "all", label: "All roles" }, { value: "admin", label: "Admin" }, { value: "salesagent", label: "Agent" },
];
const FEATURE_OPTIONS: { value: FeatureFilter; label: string }[] = [
  { value: "all", label: "All features" }, { value: "chat", label: "Chat" },
  { value: "video", label: "Video" }, { value: "studio", label: "Studio" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{children}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

export function UsageDashboard() {
  const [range,   setRange]   = useState<DateRange>("7d");
  const [role,    setRole]    = useState<RoleFilter>("all");
  const [feature, setFeature] = useState<FeatureFilter>("all");

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentDetail,     setAgentDetail]      = useState<AgentDetail | null>(null);
  const [agentLoading,    setAgentLoading]     = useState(false);
  const [agentError,      setAgentError]       = useState<string | null>(null);

  // Core
  const summary  = useFetch<Summary>(() => api.summary(range, role), [range, role]);
  const extended = useFetch<ExtendedSummary>(() => api.extendedSummary(range), [range]);
  const daily    = useFetch<DailyActivityPoint[]>(() => api.dailyActivity(range, feature), [range, feature]);
  const agents   = useFetch<TopAgent[]>(() => api.topAgents(range, role), [range, role]);
  const activity = useFetch<ActivityEvent[]>(() => api.recentActivity(range, role, feature), [range, role, feature]);

  // New analytics
  // const projects = useFetch — disabled until project_id data is populated
  const adoption  = useFetch<FeatureAdoption>(() => api.featureAdoption(range), [range]);
  const pipeline  = useFetch<VideoPipeline>(() => api.videoPipeline(), []);
  const retention = useFetch<RetentionPoint[]>(() => api.retention(range), [range]);
  const heatmap   = useFetch<HeatmapCell[]>(() => api.hourlyHeatmap(range), [range]);
  const costTrend = useFetch<DailyCostPoint[]>(() => api.costTrend(range), [range]);

  // Agent detail drawer
  useEffect(() => {
    if (!selectedAgentId) return;
    let cancelled = false;
    setAgentLoading(true); setAgentError(null); setAgentDetail(null);
    api.agentDetail(selectedAgentId, range)
      .then((d) => { if (!cancelled) { setAgentDetail(d); setAgentLoading(false); } })
      .catch((e) => { if (!cancelled) { setAgentError(e.message); setAgentLoading(false); } });
    return () => { cancelled = true; };
  }, [selectedAgentId, range]);

  const s  = summary.data;
  const ex = extended.data;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar range={range} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
          <div className="px-6 h-14 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">AskAlpha usage</div>
              <p className="text-xs text-gray-400 hidden sm:block truncate">
                AI product usage across agents, content generation, and video workflows
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <FilterSelect label="Role filter"    value={role}    onChange={setRole}    options={ROLE_OPTIONS} />
              <FilterSelect label="Feature filter" value={feature} onChange={setFeature} options={FEATURE_OPTIONS} />
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <DateRangeSelect value={range} onChange={setRange} />
              <ExportButton range={range} />
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-6 py-7 space-y-8">

          {/* ── Section: Core KPIs ── */}
          <section className="space-y-4">
            <SectionLabel>Overview</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                title="Active agents"
                value={s?.active_agents ?? null}
                icon={<Users className="h-4 w-4 text-blue-600" />}
                iconBg="bg-blue-50"
                delta={s?.deltas.active_agents}
                loading={summary.loading}
              />
              <MetricCard
                title="Chat messages"
                value={s?.chat_messages ?? null}
                icon={<MessageSquare className="h-4 w-4 text-indigo-600" />}
                iconBg="bg-indigo-50"
                subtitle="User prompts only"
                delta={s?.deltas.chat_messages}
                loading={summary.loading}
              />
              <MetricCard
                title="Videos generated"
                value={s?.videos_generated ?? null}
                icon={<Video className="h-4 w-4 text-violet-600" />}
                iconBg="bg-violet-50"
                subtitle={s ? `${s.avatar_videos} avatar · ${s.cinematic_videos} cinematic` : undefined}
                delta={s?.deltas.videos_generated}
                loading={summary.loading}
              />
              <MetricCard
                title="Studio jobs"
                value={s?.studio_jobs ?? null}
                icon={<Clapperboard className="h-4 w-4 text-amber-600" />}
                iconBg="bg-amber-50"
                subtitle={
                  s ? (
                    <span>
                      <span className="text-emerald-600">{s.studio_completed} completed</span>
                      {" · "}
                      <span className="text-red-500">{s.studio_failed} failed</span>
                    </span>
                  ) : undefined
                }
                delta={s?.deltas.studio_jobs}
                loading={summary.loading}
              />
            </div>

            {/* Second KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                title="Estimated cost"
                value={ex ? Math.round(ex.total_cost_usd * 100) / 100 : null}
                icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
                iconBg="bg-emerald-50"
                subtitle="USD · based on configured rates"
                loading={extended.loading}
              />
              <MetricCard
                title="Video success rate"
                value={ex ? Math.round(ex.video_success_rate) : null}
                icon={<CheckCircle2 className="h-4 w-4 text-teal-600" />}
                iconBg="bg-teal-50"
                subtitle="% of videos that completed"
                loading={extended.loading}
              />
              <MetricCard
                title="New agents onboarded"
                value={ex?.new_agents ?? null}
                icon={<UserPlus className="h-4 w-4 text-rose-600" />}
                iconBg="bg-rose-50"
                subtitle={ex ? `${ex.total_agents} total agents on platform` : undefined}
                loading={extended.loading}
              />
            </div>
          </section>

          {/* ── Section: Activity ── */}
          <section className="space-y-4">
            <SectionLabel>Activity</SectionLabel>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <DailyActivityChart data={daily.data} loading={daily.loading} error={daily.error} />
              </div>
              <VideoPipelineDonut data={pipeline.data} loading={pipeline.loading} error={pipeline.error} />
            </div>
          </section>

          {/* ── Section: Engagement ── */}
          <section className="space-y-4">
            <SectionLabel>Engagement</SectionLabel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FeatureAdoptionChart data={adoption.data} loading={adoption.loading} error={adoption.error} />
              <RetentionChart data={retention.data} loading={retention.loading} error={retention.error} />
            </div>
          </section>

          {/* ── Section: Patterns ── */}
          <section className="space-y-4">
            <SectionLabel>Usage patterns</SectionLabel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <HourlyHeatmap data={heatmap.data} loading={heatmap.loading} error={heatmap.error} />
              <CostTrendChart data={costTrend.data} loading={costTrend.loading} error={costTrend.error} />
            </div>
          </section>

          {/* ── Section: Agents ── */}
          <section className="space-y-4">
            <SectionLabel>Agents</SectionLabel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <TopAgentsTable
                agents={agents.data}
                loading={agents.loading}
                error={agents.error}
                onAgentClick={(id) => setSelectedAgentId(id)}
              />
              <RecentActivityFeed
                events={activity.data}
                loading={activity.loading}
                error={activity.error}
              />
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-100 pt-4 pb-2 flex items-center justify-between">
            <span className="text-xs text-gray-400">Allegiance Real Estate · AskAlpha</span>
            <span className="text-xs text-gray-400">Internal use only</span>
          </div>

        </main>
      </div>

      <AgentDetailDrawer
        agentId={selectedAgentId}
        range={range}
        data={agentDetail}
        loading={agentLoading}
        error={agentError}
        onClose={() => { setSelectedAgentId(null); setAgentDetail(null); }}
      />
    </div>
  );
}
