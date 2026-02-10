"use client";

import { useEffect, useState } from "react";
import LeaveBalanceCards from "@/components/leaves/LeaveBalanceCards";
import LeaveHistory from "@/components/leaves/LeaveHistory";
import ApplyLeaveModal from "@/components/leaves/ApplyLeaveModal";

export default function LeavesPage() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setRole(data?.user?.role || null);
      })
      .catch(() => {
        if (mounted) setRole(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const showApply = role !== "admin"; // admins manage leaves, don't apply here

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leave Management</h1>
          <p className="text-sm text-slate-400">Manage your absences and track your leave balances.</p>
        </div>
        <div>
          {showApply && (
            <button onClick={() => setOpen(true)} className="rounded bg-accent px-4 py-2 font-semibold text-slate-900">+ Apply for Leave</button>
          )}
        </div>
      </div>

      <section className="mb-6">
        <LeaveBalanceCards />
      </section>

      <section>
        <LeaveHistory role={role} />
      </section>

      <ApplyLeaveModal open={open} onClose={() => setOpen(false)} onApplied={() => window.location.reload()} />
    </div>
  );
}
