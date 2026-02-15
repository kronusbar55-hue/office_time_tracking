"use client";

import { useEffect, useState } from "react";

type Balance = {
  _id: string;
  year: number;
  leaveType: { _id: string; name: string; code?: string; annualQuota?: number };
  totalAllocated: number;
  used: number;
  remaining: number;
};

export default function LeaveBalanceCards() {
  const [balances, setBalances] = useState<Balance[] | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/leaves/balances")
      .then((r) => r.json())
      .then((data) => {
        if (mounted) setBalances(data.data || []);
      })
      .catch((err) => {
        console.error("Failed to load balances", err);
        if (mounted) setBalances([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!balances) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-800/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {balances.map((b) => {
        const remainingDays = Math.round((b.remaining || 0) / 480);
        const totalDays = Math.round((b.totalAllocated || 0) / 480);
        const label = b.leaveType.code || b.leaveType.name;

        return (
          <div
            key={b._id}
            className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-5 transition-all hover:border-emerald-500/30 hover:shadow-lg"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {label}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {remainingDays} <span className="text-sm font-normal text-slate-500">/ {totalDays}</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">Remaining days</p>
          </div>
        );
      })}
    </div>
  );
}
