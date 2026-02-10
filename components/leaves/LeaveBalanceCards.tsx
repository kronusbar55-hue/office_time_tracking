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
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-900/40 p-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {balances.map((b) => {
        const remainingDays = Math.round((b.remaining || 0) / 480);
        const totalDays = Math.round((b.totalAllocated || 0) / 480);
        return (
          <div key={b._id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">{b.leaveType.code || b.leaveType.name}</p>
                <p className="font-medium">{b.leaveType.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{remainingDays}</p>
                <p className="text-xs text-slate-500">Remaining / {totalDays}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
