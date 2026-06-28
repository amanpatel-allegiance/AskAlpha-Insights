"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { DailyActivityPoint } from "@/types";
import { format, parseISO } from "date-fns";

const COLORS = {
  chat: "#3b82f6",
  video: "#8b5cf6",
  studio: "#f59e0b",
};

function SkeletonChart() {
  return (
    <div className="h-64 bg-gray-50 rounded-lg animate-pulse flex items-end gap-2 p-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-gray-200 rounded"
          style={{ height: `${30 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  );
}

interface Props {
  data: DailyActivityPoint[] | null;
  loading?: boolean;
  error?: string | null;
}

export function DailyActivityChart({ data, loading, error }: Props) {
  const formatted = data?.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Daily activity by feature</h2>
        <p className="text-xs text-gray-400 mt-0.5">Chat, video, and studio usage over the selected period</p>
      </div>

      {loading ? (
        <SkeletonChart />
      ) : error ? (
        <div className="h-64 flex items-center justify-center text-sm text-red-500">{error}</div>
      ) : !formatted || formatted.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">
          No activity data for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256}>
          <BarChart data={formatted} barGap={2} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: "#64748b", paddingTop: 12 }}
            />
            <Bar dataKey="chat" name="Chat" stackId="a" fill={COLORS.chat} radius={[0, 0, 0, 0]} />
            <Bar dataKey="video" name="Video" stackId="a" fill={COLORS.video} radius={[0, 0, 0, 0]} />
            <Bar dataKey="studio" name="Studio" stackId="a" fill={COLORS.studio} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
