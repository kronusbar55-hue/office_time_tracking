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
      <div className="space-y-4">
        <div className="h-8 w-1/4 animate-pulse rounded bg-slate-800" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-800/40" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
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
                  : "border border-white/10 bg-transparent text-slate-400 hover:border-white/20 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-slate-900/30 py-16 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/60 text-4xl">
            📋
          </div>
          <h3 className="text-lg font-semibold text-slate-200">
            No {filter !== "all" ? filter : ""} leave requests
          </h3>
          <p className="mt-2 text-sm text-slate-500">
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
