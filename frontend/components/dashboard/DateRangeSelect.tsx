"use client";

import type { DateRange } from "@/types";

const OPTIONS: { value: DateRange; label: string }[] = [
  { value: "1d",         label: "Today" },
  { value: "7d",         label: "Last 7 days" },
  { value: "30d",        label: "Last 30 days" },
  { value: "this_month", label: "This month" },
];

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;

interface Props {
  value: DateRange;
  onChange: (v: DateRange) => void;
}

export function DateRangeSelect({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DateRange)}
      className="h-9 rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none transition-colors"
      style={{ backgroundImage: CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
