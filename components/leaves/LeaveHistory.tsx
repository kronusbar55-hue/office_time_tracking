"use client";

import { useEffect, useState } from "react";
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
  appliedAt?: string;
};

export default function LeaveHistory({ role }: { role?: string | null }) {
  const [leaves, setLeaves] = useState<Leave[] | null>(null);

  const load = () => {
    setLeaves(null);
    const endpoint = role === "admin" ? "/api/leaves/all" : "/api/leaves/my";
    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => setLeaves(data.data || []))
      .catch((err) => {
        console.error(err);
        setLeaves([]);
      });
  };

  useEffect(() => {
    load();
  }, [role]);

  if (!leaves) {
    return (
      <div className="mt-6 space-y-3">
        <div className="h-6 w-1/4 animate-pulse rounded bg-slate-800" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg bg-slate-800/40" />
        ))}
      </div>
    );
  }

  if (leaves.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-center">
        <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-slate-800/40 flex items-center justify-center text-4xl">📭</div>
        <h3 className="text-lg font-semibold">No leave records found</h3>
        <p className="text-sm text-slate-400">No leave records found. Apply your first leave request.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {leaves.map((l) => (
        <LeaveCard key={l._id} leave={l} role={role} onDone={() => load()} />
      ))}
    </div>
  );
}
