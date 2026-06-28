import { cn } from "@/lib/utils";

type Status = "completed" | "processing" | "failed" | "pending" | "draft";

const styles: Record<Status, string> = {
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  processing: "bg-blue-50 text-blue-700 ring-blue-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  draft: "bg-gray-100 text-gray-600 ring-gray-200",
};

const labels: Record<Status, string> = {
  completed: "Completed",
  processing: "Processing",
  failed: "Failed",
  pending: "Pending",
  draft: "Draft",
};

export function StatusPill({ status }: { status: string }) {
  const s = (status as Status) in styles ? (status as Status) : "draft";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        styles[s]
      )}
    >
      {labels[s]}
    </span>
  );
}
