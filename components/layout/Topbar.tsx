"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import LiveTimerDisplay from "@/components/time-tracking/LiveTimerDisplay";

import { ThemeToggle } from "@/components/ThemeToggle";

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
      <header className="flex h-14 items-center justify-between border-b border-border-color bg-header/95 px-4 shadow-lg shadow-black/40">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.18em] text-text-secondary">
            Overview
          </span>
          <span className="text-xs font-semibold text-text-primary">Loading...</span>
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border-color bg-header/95 px-4 shadow-lg shadow-black/40">
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-[0.18em] text-text-secondary">
          Overview
        </span>
        <span className="text-xs font-semibold text-text-primary">{today}</span>
      </div>

      <div className="flex items-center gap-4">
        <LiveTimerDisplay />
        <div className="h-6 w-px bg-border-color/50" />
        <ThemeToggle />
      </div>
    </header>
  );
}
