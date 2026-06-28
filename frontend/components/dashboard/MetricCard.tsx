import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number | null;
  icon: React.ReactNode;
  iconBg: string;
  subtitle?: React.ReactNode;
  delta?: { value: number; pct: number | null } | null;
  loading?: boolean;
}

function DeltaBadge({ delta }: { delta: MetricCardProps["delta"] }) {
  if (!delta) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-300 font-medium">
        <Minus className="h-3 w-3" />
        No prior data
      </span>
    );
  }
  const { pct } = delta;
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
        <Minus className="h-3 w-3" />
        No prior period
      </span>
    );
  }
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      )}
    >
      {up ? <TrendingUp className="h-3 w-3 flex-shrink-0" /> : <TrendingDown className="h-3 w-3 flex-shrink-0" />}
      {up ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

export function MetricCard({ title, value, icon, iconBg, subtitle, delta, loading }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-gray-500 leading-tight pt-0.5">{title}</span>
        <span className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
          {icon}
        </span>
      </div>

      {/* Value */}
      <div className="mt-4">
        {loading ? (
          <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <div className="text-[1.75rem] font-bold text-gray-900 tracking-tight leading-none">
            {value !== null ? formatNumber(value) : "—"}
          </div>
        )}
      </div>

      {/* Subtitle — fixed height so cards stay the same regardless of whether subtitle exists */}
      <div className="mt-1.5 h-4 flex items-center">
        {loading ? (
          <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
        ) : subtitle ? (
          <div className="text-xs text-gray-400 leading-none truncate">{subtitle}</div>
        ) : null}
      </div>

      {/* Delta — always pinned at bottom with separator */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        {loading ? (
          <div className="h-4 w-16 bg-gray-100 rounded-full animate-pulse" />
        ) : (
          <>
            <DeltaBadge delta={delta} />
            <span className="text-[10px] text-gray-300 font-medium">vs prev period</span>
          </>
        )}
      </div>
    </div>
  );
}
