"use client";

import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { RetentionPoint } from "@/types";

interface Props {
  data: RetentionPoint[] | null;
  loading?: boolean;
  error?: string | null;
}

export function RetentionChart({ data, loading, error }: Props) {
  const chartData = data?.map((d) => ({
    ...d,
    label: format(parseISO(d.week), "MMM d"),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Weekly active agents</h2>
        <p className="text-xs text-gray-400 mt-0.5">Unique agents who sent at least one chat per week</p>
      </div>

      {loading ? (
        <div className="h-44 bg-gray-50 rounded-lg animate-pulse" />
      ) : error ? (
        <div className="h-44 flex items-center justify-center text-sm text-red-500">{error}</div>
      ) : !chartData || chartData.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-sm text-gray-400">
          Not enough data for weekly view.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={176}>
          <LineChart data={chartData}>
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
              width={24}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
              formatter={(val: number) => [`${val} agents`, "Unique agents"]}
            />
            <Line
              type="monotone"
              dataKey="unique_agents"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
