import type { FeatureAdoption } from "@/types";
import { MessageSquare, Video, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  agents: number;
  total: number;
  pct: number;
  color: string;
}

function FeatureRow({ icon, iconBg, label, agents, total, pct, color }: FeatureRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">{label}</span>
          <span className="text-xs text-gray-500 font-semibold">{agents} / {total} agents · {pct}%</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", color)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-2 w-full bg-gray-100 rounded-full animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  data: FeatureAdoption | null;
  loading?: boolean;
  error?: string | null;
}

export function FeatureAdoptionChart({ data, loading, error }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-gray-900">Feature adoption</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Share of agents that used each feature in this period
          {data && <span className="text-gray-500"> · {data.total_agents} total agents</span>}
        </p>
      </div>

      {loading ? <Skeleton /> : error ? (
        <div className="h-32 flex items-center justify-center text-sm text-red-500">{error}</div>
      ) : !data ? null : (
        <div className="space-y-5">
          <FeatureRow
            icon={<MessageSquare className="h-3.5 w-3.5 text-blue-600" />}
            iconBg="bg-blue-50"
            label="Chat"
            agents={data.chat_agents}
            total={data.total_agents}
            pct={data.chat_pct}
            color="bg-blue-500"
          />
          <FeatureRow
            icon={<Video className="h-3.5 w-3.5 text-violet-600" />}
            iconBg="bg-violet-50"
            label="Video generation"
            agents={data.video_agents}
            total={data.total_agents}
            pct={data.video_pct}
            color="bg-violet-500"
          />
          <FeatureRow
            icon={<Clapperboard className="h-3.5 w-3.5 text-amber-600" />}
            iconBg="bg-amber-50"
            label="Studio"
            agents={data.studio_agents}
            total={data.total_agents}
            pct={data.studio_pct}
            color="bg-amber-500"
          />
        </div>
      )}
    </div>
  );
}
