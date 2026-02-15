"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import LiveTimerDisplay from "@/components/time-tracking/LiveTimerDisplay";

export function Topbar() {
  const { user } = useAuth();
  const [today, setToday] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setToday(format(new Date(), "EEEE, dd MMM yyyy"));
  }, []);

  if (!mounted) {
    return (
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-header/95 px-4 shadow-lg shadow-black/40">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Overview
          </span>
          <span className="text-xs font-semibold text-slate-100">Loading...</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden flex-col text-right text-[11px] leading-tight sm:flex">
            <span className="font-medium text-slate-100">Not signed in</span>
            <span className="text-slate-400"></span>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-header/95 px-4 shadow-lg shadow-black/40">
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
          Overview
        </span>
        <span className="text-xs font-semibold text-slate-100">{today}</span>
      </div>

      <div className="flex items-center gap-4">
        <LiveTimerDisplay />
        <div className="hidden flex-col text-right text-[11px] leading-tight sm:flex">
          <span className="font-medium text-slate-100">
            {user
              ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
              : "Not signed in"}
          </span>
          <span className="text-slate-400">
            {user && user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ""}
          </span>
        </div>
      </div>
    </header>
  );
}

