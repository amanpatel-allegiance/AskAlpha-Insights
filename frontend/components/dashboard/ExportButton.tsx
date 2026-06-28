"use client";

import { Download } from "lucide-react";
import { api } from "@/lib/api";
import type { DateRange } from "@/types";

export function ExportButton({ range }: { range: DateRange }) {
  const handleExport = () => {
    const url = api.exportUrl(range);
    const a = document.createElement("a");
    a.href = url;
    a.download = `askalpha-usage-${range}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 h-9 rounded-lg border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <Download className="h-4 w-4 text-gray-500" />
      Export
    </button>
  );
}
