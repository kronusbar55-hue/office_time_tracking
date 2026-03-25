"use client";

import { useCallback, useEffect, useState } from "react";
import LeaveCard from "@/components/leaves/LeaveCard";

type Leave = {
  _id: string;
  leaveType: any;
  startDate: string;
  endDate: string;
  duration: string;
  reason?: string;
  status: string;
  attachments?: any[];
  user?: any;
  ccUsers?: any[];
  appliedAt?: string;
};

type Filter = "all" | "approved" | "pending" | "rejected";

export default function LeaveHistory({
  role,
  onOpenApply,
  showApply,
}: {
  role?: string | null;
  onOpenApply?: () => void;
  showApply?: boolean;
}) {
  const [leaves, setLeaves] = useState<Leave[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(() => {
    setLeaves(null);
    const endpoint = role === "admin" ? "/api/leaves/all" : "/api/leaves/my";
    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => setLeaves(data.data || []))
      .catch((err) => {
        console.error(err);
        setLeaves([]);
      });
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    leaves === null
      ? []
      : filter === "all"
        ? leaves
        : leaves.filter((l) => l.status === filter);

  if (!leaves) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-border-color dark:bg-bg-secondary/40" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-4 rounded-2xl border border-border-color bg-bg-secondary/40 p-5 animate-pulse">
               <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-border-color dark:bg-bg-secondary/40" />
                    <div className="space-y-2">
                       <div className="h-4 w-32 rounded bg-border-color dark:bg-bg-secondary/40" />
                       <div className="h-3 w-48 rounded bg-border-color dark:bg-bg-secondary/60" />
                    </div>
                  </div>
                  <div className="h-7 w-20 rounded-full bg-border-color dark:bg-bg-secondary/60" />
               </div>
               <div className="h-8 w-full rounded-xl bg-border-color dark:bg-bg-secondary/30" />
               <div className="flex items-center justify-between pt-2">
                  <div className="flex -space-x-2">
                    {Array.from({ length: 2 }).map((_, j) => (
                      <div key={j} className="h-6 w-6 rounded-full border-2 border-slate-950 bg-border-color dark:bg-bg-secondary/40" />
                    ))}
                  </div>
                  <div className="h-4 w-24 rounded bg-border-color dark:bg-bg-secondary/40" />
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border-color pb-4">
        <h2 className="font-display text-xl font-semibold text-emerald-400">
          Leave Requests
        </h2>
        <div className="flex gap-2">
          {(["all", "approved", "pending", "rejected"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                filter === f
                  ? "border border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                  : "border border-border-color bg-transparent text-text-secondary hover:border-border-color hover:bg-card-bg/40 hover:text-text-primary"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border-color bg-bg-secondary/30 py-16 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-card-bg/60 text-4xl">
            📋
          </div>
          <h3 className="text-lg font-semibold text-text-primary">
            No {filter !== "all" ? filter : ""} leave requests
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            {showApply
              ? "Apply for leave using the form on the right."
              : "No leave records match your filters."}
          </p>
          {showApply && onOpenApply && (
            <button
              onClick={onOpenApply}
              className="mt-4 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30"
            >
              + Apply for Leave
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((l, i) => (
            <div
              key={l._id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <LeaveCard leave={l} role={role} onDone={() => load()} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
