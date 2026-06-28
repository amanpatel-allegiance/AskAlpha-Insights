"use client";

import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { DailyCostPoint } from "@/types";

interface Props {
  data: DailyCostPoint[] | null;
  loading?: boolean;
  error?: string | null;
}

export function CostTrendChart({ data, loading, error }: Props) {
  const chartData = data?.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
    cost: d.estimated_cost_usd,
  }));

  const total = data?.reduce((s, d) => s + d.estimated_cost_usd, 0) ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Estimated cost trend</h2>
          <p className="text-xs text-gray-400 mt-0.5">Daily AI usage cost based on configured rates</p>
        </div>
        {!loading && data && (
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">${total.toFixed(2)}</div>
            <div className="text-xs text-gray-400">period total</div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-44 bg-gray-50 rounded-lg animate-pulse" />
      ) : error ? (
        <div className="h-44 flex items-center justify-center text-sm text-red-500">{error}</div>
      ) : !chartData || chartData.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-sm text-gray-400">No cost data.</div>
      ) : (
        <ResponsiveContainer width="100%" height={176}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              width={36}
              tickFormatter={(v) => `$${v.toFixed(2)}`}
            />
            <Tooltip
              contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
              formatter={(val: number) => [`$${val.toFixed(4)}`, "Est. cost"]}
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#costGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
