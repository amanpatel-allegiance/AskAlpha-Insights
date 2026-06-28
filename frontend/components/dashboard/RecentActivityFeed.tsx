"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ActivityEvent } from "@/types";
import { formatRelativeTime } from "@/lib/utils";
import { StatusPill } from "./StatusPill";
import { FeatureIcon } from "./FeatureIcon";

const PAGE_SIZE = 10;

function FeedSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-5 py-3">
          <div className="h-7 w-7 rounded-lg bg-gray-100 animate-pulse flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-48 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-64 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
        </div>
      ))}
    </div>
  );
}

interface Props {
  events: ActivityEvent[] | null;
  loading?: boolean;
  error?: string | null;
}

export function RecentActivityFeed({ events, loading, error }: Props) {
  const [page, setPage] = useState(0);

  const totalPages = events ? Math.ceil(events.length / PAGE_SIZE) : 0;
  const slice = events ? events.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) : [];
  const from = events && events.length > 0 ? page * PAGE_SIZE + 1 : 0;
  const to = events ? Math.min(page * PAGE_SIZE + PAGE_SIZE, events.length) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
        <p className="text-xs text-gray-400 mt-0.5">Latest actions across chat, video, and studio</p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <FeedSkeleton />
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-500">{error}</div>
        ) : !events || events.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No recent activity.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {slice.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors"
              >
                <FeatureIcon feature={event.feature} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{event.agent_name}</span>
                    <span className="text-xs text-gray-400">{formatRelativeTime(event.timestamp)}</span>
                  </div>
                  {event.prompt && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      &ldquo;{event.prompt}&rdquo;
                    </p>
                  )}
                </div>
                <StatusPill status={event.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer — same height and structure as TopAgentsTable footer */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-gray-400">
          {events && events.length > 0 ? `${from}–${to} of ${events.length}` : loading ? "Loading…" : "No data"}
        </span>
        {!loading && events && events.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-gray-500 px-2 font-medium">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
