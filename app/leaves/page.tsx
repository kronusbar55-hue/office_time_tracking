"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import LeaveBalanceCards from "@/components/leaves/LeaveBalanceCards";
import LeaveHistory from "@/components/leaves/LeaveHistory";
import ApplyLeaveModal from "@/components/leaves/ApplyLeaveModal";

export default function LeavesPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const role = user?.role || null;
  const showApply = role !== "admin";

  const userName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User"
    : "User";

  return (
    <div className="min-h-screen">
      {/* Decorative background */}
      <div
        className="pointer-events-none fixed -right-1/2 -top-1/2 h-full w-full bg-[radial-gradient(circle,rgba(16,185,129,0.03)_0%,transparent_70%)]"
        aria-hidden
      />

      <div className="relative z-10 p-6 lg:p-8">
        {/* Header */}
        <header className="mb-8 animate-fade-in-up">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="font-display text-3xl font-bold text-emerald-400 lg:text-4xl">
                Leave Management
              </h1>
              <p className="mt-2 text-slate-400">
                Manage your time off requests and team absences
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/60 px-5 py-3 shadow-lg">
              <div className="font-semibold text-emerald-400">{userName}</div>
              <div className="text-xs text-slate-500">
                {role === "admin" ? "Admin" : "Employee"}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className={`grid gap-8 ${showApply ? "lg:grid-cols-[1fr_380px]" : ""}`}>
          {/* Leave list section */}
          <section className="animate-fade-in-up">
            <LeaveBalanceCards />
            <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm">
              <LeaveHistory role={role} onOpenApply={() => setOpen(true)} showApply={showApply} />
            </div>
          </section>

          {/* Apply for Leave sidebar */}
          {showApply && (
            <aside className="animate-fade-in-up lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm">
                <h2 className="font-display mb-6 border-b-2 border-white/10 pb-4 text-xl font-semibold text-emerald-400">
                  Apply for Leave
                </h2>
                <p className="mb-6 text-sm text-slate-400">
                  Submit a new leave request. Your manager will be notified.
                </p>
                <button
                  onClick={() => setOpen(true)}
                  className="w-full rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 px-6 py-8 font-semibold text-emerald-400 transition-all hover:border-emerald-500/60 hover:bg-emerald-500/10"
                >
                  + Apply for Leave
                </button>
              </div>
            </aside>
          )}
        </div>

        <ApplyLeaveModal
          open={open}
          onClose={() => setOpen(false)}
          onApplied={() => window.location.reload()}
        />
      </div>
    </div>
  );
}
