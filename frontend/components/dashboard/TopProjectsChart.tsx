"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from "recharts";
import type { TopProject } from "@/types";

const BLUE_SHADES = ["#1d4ed8","#2563eb","#3b82f6","#60a5fa","#93c5fd","#bfdbfe","#dbeafe","#eff6ff","#f8faff","#fafbff"];

function Skeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-28 bg-gray-100 rounded animate-pulse flex-shrink-0" />
          <div className="h-5 rounded animate-pulse bg-gray-100" style={{ width: `${70 - i * 10}%` }} />
        </div>
      ))}
    </div>
  );
}

interface Props {
  data: TopProject[] | null;
  loading?: boolean;
  error?: string | null;
}

export function TopProjectsChart({ data, loading, error }: Props) {
  const chartData = data?.map((p) => ({
    name: p.project_name.length > 22 ? p.project_name.slice(0, 22) + "…" : p.project_name,
    fullName: p.project_name,
    developer: p.developer_name,
    region: p.region ?? "—",
    queries: p.query_count,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Most researched projects</h2>
        <p className="text-xs text-gray-400 mt-0.5">Projects agents query most via AskAlpha chat</p>
      </div>

      {loading ? <Skeleton /> : error ? (
        <div className="h-52 flex items-center justify-center text-sm text-red-500">{error}</div>
      ) : !chartData || chartData.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-sm text-gray-400">
          No project-scoped conversations in this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartData.length * 38 + 20}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 11, fill: "#374151" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
              formatter={(val: number) => [`${val} queries`, "Queries"]}
              labelFormatter={(label, payload) => {
                const p = payload?.[0]?.payload;
                return p ? `${p.fullName} · ${p.developer}` : label;
              }}
            />
            <Bar dataKey="queries" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={BLUE_SHADES[Math.min(i, BLUE_SHADES.length - 1)]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
