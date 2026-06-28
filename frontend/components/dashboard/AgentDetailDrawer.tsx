"use client";

import { useEffect, useRef } from "react";
import {
  X,
  MessageSquare,
  Video,
  Clapperboard,
  Mail,
  Calendar,
  DollarSign,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { AgentDetail, DateRange } from "@/types";
import { formatRelativeTime, formatCurrency, initials, cn } from "@/lib/utils";
import { StatusPill } from "./StatusPill";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];
function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-violet-50 text-violet-700 ring-violet-200",
  salesagent: "bg-blue-50 text-blue-700 ring-blue-200",
};
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  salesagent: "Agent",
};

interface StatChipProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}
function StatChip({ icon, label, value, sub, color }: StatChipProps) {
  return (
    <div className="flex-1 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className={cn("inline-flex items-center justify-center h-7 w-7 rounded-lg mb-2", color)}>
        {icon}
      </div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

interface Props {
  agentId: string | null;
  range: DateRange;
  data: AgentDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function AgentDetailDrawer({ agentId, range, data, loading, error, onClose }: Props) {
  const open = agentId !== null;
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const chartData = data?.daily_activity.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
  }));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          "fixed right-0 top-0 z-40 h-full w-full max-w-[620px] bg-white shadow-xl flex flex-col",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-900">Agent deep dive</span>
          <button
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <DrawerSkeleton />
          ) : error ? (
            <div className="flex items-center justify-center h-48 text-sm text-red-500">{error}</div>
          ) : !data ? null : (
            <div className="px-6 py-5 space-y-6">

              {/* Agent identity */}
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    "h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0",
                    avatarColor(data.agent_id)
                  )}
                >
                  {initials(data.name)}
                </span>
                <div>
                  <div className="text-base font-semibold text-gray-900">{data.name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                        ROLE_STYLES[data.role] ?? "bg-gray-100 text-gray-600 ring-gray-200"
                      )}
                    >
                      {ROLE_LABELS[data.role] ?? data.role}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Mail className="h-3 w-3" /> {data.email}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" /> Member since {data.member_since}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stat chips */}
              <div className="flex gap-3">
                <StatChip
                  icon={<MessageSquare className="h-3.5 w-3.5 text-blue-600" />}
                  color="bg-blue-50"
                  label="Chat messages"
                  value={data.summary.chat_count.toLocaleString()}
                  sub={`${data.summary.conversations_count} conversations`}
                />
                <StatChip
                  icon={<Video className="h-3.5 w-3.5 text-violet-600" />}
                  color="bg-violet-50"
                  label="Videos"
                  value={data.summary.video_count.toLocaleString()}
                  sub={`${data.summary.avatar_count} avatar · ${data.summary.cinematic_count} cinematic`}
                />
                <StatChip
                  icon={<Clapperboard className="h-3.5 w-3.5 text-amber-600" />}
                  color="bg-amber-50"
                  label="Studio jobs"
                  value={data.summary.studio_count.toLocaleString()}
                  sub={`${data.summary.studio_completed} completed`}
                />
              </div>

              {/* Estimated cost */}
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-50">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(data.summary.estimated_cost_usd)}
                  </div>
                  <div className="text-xs text-gray-400">Estimated cost for this period</div>
                </div>
              </div>

              {/* Activity trend chart */}
              <div>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Activity trend</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Daily usage breakdown across features</p>
                </div>
                {chartData && chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData}>
                      <CartesianGrid vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        width={24}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          fontSize: 11,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={7}
                        wrapperStyle={{ fontSize: 11, color: "#64748b", paddingTop: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="chat"
                        name="Chat"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="video"
                        name="Video"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="studio"
                        name="Studio"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-32 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-xl">
                    No activity data for this period
                  </div>
                )}
              </div>

              {/* Recent chat prompts */}
              {data.recent_chats.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent chat prompts</h3>
                  <div className="space-y-2">
                    {data.recent_chats.map((msg) => (
                      <div
                        key={msg.id}
                        className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
                      >
                        <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
                          &ldquo;{msg.content}&rdquo;
                        </p>
                        <span className="text-xs text-gray-400 mt-1 block">
                          {formatRelativeTime(msg.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent videos */}
              {data.recent_videos.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent videos</h3>
                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                    {data.recent_videos.map((v) => (
                      <div key={v.id} className="flex items-start gap-3 px-4 py-3 bg-white">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset flex-shrink-0 mt-0.5",
                            v.mode === "cinematic"
                              ? "bg-violet-50 text-violet-700 ring-violet-200"
                              : "bg-blue-50 text-blue-700 ring-blue-200"
                          )}
                        >
                          {v.mode}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 truncate">{v.script || "—"}</p>
                          <span className="text-xs text-gray-400">{formatRelativeTime(v.created_at)}</span>
                        </div>
                        <StatusPill status={v.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent studio jobs */}
              {data.recent_studio.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent studio jobs</h3>
                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                    {data.recent_studio.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3 bg-white">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{s.title}</p>
                          <span className="text-xs text-gray-400">{s.tool} · {formatRelativeTime(s.created_at)}</span>
                        </div>
                        <StatusPill status={s.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerSkeleton() {
  return (
    <div className="px-6 py-5 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-gray-100 flex-shrink-0" />
        <div className="space-y-2">
          <div className="h-4 w-36 bg-gray-100 rounded" />
          <div className="h-3 w-48 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 h-24 rounded-xl bg-gray-100" />
        ))}
      </div>
      <div className="h-12 rounded-xl bg-gray-100" />
      <div className="h-48 rounded-xl bg-gray-100" />
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
