import type { TopAgent } from "@/types";
import { initials, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-violet-50 text-violet-700 ring-violet-200",
  salesagent: "bg-blue-50 text-blue-700 ring-blue-200",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  salesagent: "Agent",
};

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

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 px-5">
          <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-3.5 w-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-3.5 w-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-3.5 w-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-3.5 w-14 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

interface Props {
  agents: TopAgent[] | null;
  loading?: boolean;
  error?: string | null;
  onAgentClick?: (agentId: string) => void;
}

export function TopAgentsTable({ agents, loading, error, onAgentClick }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Top agents</h2>
        <p className="text-xs text-gray-400 mt-0.5">Ranked by total usage in period</p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-500">{error}</div>
        ) : !agents || agents.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No agent activity in this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-2.5">
                  Agent
                </th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">
                  Chat
                </th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">
                  Video
                </th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5">
                  Studio
                </th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-2.5">
                  Est. cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agents.map((agent) => (
                <tr
                  key={agent.agent_id}
                  onClick={() => onAgentClick?.(agent.agent_id)}
                  className={cn(
                    "transition-colors",
                    onAgentClick
                      ? "cursor-pointer hover:bg-blue-50/50"
                      : "hover:bg-gray-50/60"
                  )}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                          avatarColor(agent.agent_id)
                        )}
                      >
                        {initials(agent.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{agent.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-1.5 py-px text-xs font-medium ring-1 ring-inset flex-shrink-0",
                              ROLE_STYLES[agent.role] ?? "bg-gray-100 text-gray-600 ring-gray-200"
                            )}
                          >
                            {ROLE_LABELS[agent.role] ?? agent.role}
                          </span>
                          <span className="text-xs text-gray-400 truncate">{agent.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {agent.chat_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {agent.video_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {agent.studio_count.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-700">
                    {formatCurrency(agent.estimated_cost_usd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer — mirrors the activity feed footer height exactly */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-gray-400">
          {agents && agents.length > 0
            ? `Showing top ${agents.length} agents`
            : loading
            ? "Loading…"
            : "No data"}
        </span>
        <span className="text-xs text-gray-300">Sorted by total usage</span>
      </div>
    </div>
  );
}
