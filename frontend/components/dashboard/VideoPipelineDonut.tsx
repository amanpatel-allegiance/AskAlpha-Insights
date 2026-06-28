"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { VideoPipeline } from "@/types";

const SEGMENTS = [
  { key: "completed",  label: "Completed",  color: "#10b981" },
  { key: "processing", label: "Processing", color: "#3b82f6" },
  { key: "pending",    label: "Pending",    color: "#f59e0b" },
  { key: "failed",     label: "Failed",     color: "#ef4444" },
] as const;

interface Props {
  data: VideoPipeline | null;
  loading?: boolean;
  error?: string | null;
}

export function VideoPipelineDonut({ data, loading, error }: Props) {
  const chartData = data
    ? SEGMENTS.map((s) => ({ name: s.label, value: data[s.key], color: s.color })).filter((d) => d.value > 0)
    : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col h-full">
      <div className="mb-3 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Video pipeline</h2>
        <p className="text-xs text-gray-400 mt-0.5">All-time status breakdown · {data?.total ?? 0} total</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-36 w-36 rounded-full bg-gray-100 animate-pulse" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-sm text-red-500">{error}</div>
      ) : !data || data.total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No videos yet.</div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={76}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
                formatter={(val: number) => [`${val} videos`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Success rate badge */}
          <div className="text-center -mt-2">
            <div className="text-2xl font-bold text-gray-900">{data.success_rate}%</div>
            <div className="text-xs text-gray-400">success rate</div>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4">
            {SEGMENTS.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-gray-500">{s.label}</span>
                <span className="text-xs font-semibold text-gray-800 ml-auto">{data[s.key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
