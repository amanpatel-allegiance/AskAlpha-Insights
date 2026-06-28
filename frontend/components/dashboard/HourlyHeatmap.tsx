"use client";

import { useState } from "react";
import type { HeatmapCell } from "@/types";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function heatColor(count: number, max: number): string {
  if (max === 0 || count === 0) return "bg-gray-50";
  const ratio = count / max;
  if (ratio < 0.15) return "bg-blue-100";
  if (ratio < 0.30) return "bg-blue-200";
  if (ratio < 0.50) return "bg-blue-300";
  if (ratio < 0.70) return "bg-blue-400";
  if (ratio < 0.85) return "bg-blue-500";
  return "bg-blue-600";
}

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

interface Props {
  data: HeatmapCell[] | null;
  loading?: boolean;
  error?: string | null;
}

export function HourlyHeatmap({ data, loading, error }: Props) {
  const [tooltip, setTooltip] = useState<{ dow: number; hour: number; count: number } | null>(null);

  // Build lookup map
  const lookup = new Map<string, number>();
  data?.forEach((c) => lookup.set(`${c.dow}-${c.hour}`, c.count));
  const max = data ? Math.max(...data.map((c) => c.count), 1) : 1;

  // Show every 3rd hour label
  const hourLabels = HOURS.filter((h) => h % 3 === 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Activity by hour</h2>
        <p className="text-xs text-gray-400 mt-0.5">Chat conversations by day of week and hour (Dubai time, GST)</p>
      </div>

      {loading ? (
        <div className="h-40 bg-gray-50 rounded-lg animate-pulse" />
      ) : error ? (
        <div className="h-40 flex items-center justify-center text-sm text-red-500">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            {/* Hour labels */}
            <div className="flex mb-1 ml-10">
              {HOURS.map((h) => (
                <div key={h} className="flex-1 text-center">
                  {hourLabels.includes(h) && (
                    <span className="text-[9px] text-gray-400">{formatHour(h)}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Grid */}
            {DAYS.map((day, dow) => (
              <div key={dow} className="flex items-center mb-0.5">
                <span className="w-10 text-[10px] text-gray-400 flex-shrink-0 pr-1 text-right">{day}</span>
                {HOURS.map((hour) => {
                  const count = lookup.get(`${dow}-${hour}`) ?? 0;
                  return (
                    <div
                      key={hour}
                      className="flex-1 mx-px"
                      onMouseEnter={() => setTooltip({ dow, hour, count })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div
                        className={cn(
                          "h-5 rounded-sm cursor-default transition-opacity hover:opacity-80",
                          heatColor(count, max)
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Colour scale legend */}
            <div className="flex items-center gap-1.5 mt-3 justify-end">
              <span className="text-[10px] text-gray-400">Less</span>
              {["bg-gray-50","bg-blue-100","bg-blue-200","bg-blue-300","bg-blue-400","bg-blue-500","bg-blue-600"].map((c) => (
                <div key={c} className={cn("h-3 w-4 rounded-sm", c)} />
              ))}
              <span className="text-[10px] text-gray-400">More</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating tooltip */}
      {tooltip && (
        <div className="mt-2 text-xs text-gray-600 text-right">
          {DAYS[tooltip.dow]} {formatHour(tooltip.hour)} — <strong>{tooltip.count}</strong> conversations
        </div>
      )}
    </div>
  );
}
