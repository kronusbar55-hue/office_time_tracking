"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import HeroSessionCard from "@/components/time-tracking/HeroSessionCard";
import ActionButtons from "@/components/time-tracking/ActionButtons";
import AnimatedSummaryCards from "@/components/time-tracking/AnimatedSummaryCards";
import TrackedHoursPanel from "@/components/time-tracking/TrackedHoursPanel";
import { useTimeTracking } from "@/components/time-tracking/TimeTrackingProvider";
import { AlertCircle } from "lucide-react";

const TimeTrackingCharts = dynamic(
  () => import("@/components/time-tracking/TimeTrackingCharts"),
  { ssr: false }
);

function InnerTimeTracking() {
  const {
    active,
    workedMs,
    breakMs,
    overtimeMs,
    refreshKey,
    error,
  } = useTimeTracking();

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Time Tracking</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track your work hours, breaks, and productivity
          </p>
        </div>
        <div className="flex gap-2">
          {/* <button
            onClick={() => setViewMode("list")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${viewMode === "list"
                ? "bg-accent text-slate-900"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
          >
            List View
          </button> */}
          {/* <button
            onClick={() => setViewMode("calendar")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              viewMode === "calendar"
                ? "bg-accent text-slate-900"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            Calendar
          </button> */}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Sticky action buttons on mobile */}
      <div className="sticky top-4 z-10 rounded-xl border border-white/10 bg-slate-900/95 p-4 backdrop-blur-md sm:static sm:rounded-2xl sm:border-white/10 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <ActionButtons />
      </div>

      {/* Hero Session Timer */}
      <HeroSessionCard />

      {/* Summary Cards (when active session) */}
      {active && (
        <AnimatedSummaryCards
          workedMs={workedMs}
          breakMs={breakMs}
          overtimeMs={overtimeMs}
        />
      )}

      {viewMode === "list" ? (
        <>
          {/* Tracked Hours Panel */}
          <TrackedHoursPanel />

          {/* Graph Analytics */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-sm">
            <h2 className="mb-6 text-lg font-bold uppercase tracking-wide text-slate-100">
              Analytics & Reports
            </h2>
            <TimeTrackingCharts refreshKey={refreshKey} />
          </div>
        </>
      ) : (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/10 bg-slate-900/40">
          <p className="text-slate-500">Calendar view coming soon</p>
        </div>
      )}
    </div>
  );
}

export default function TimeTrackingPage() {
  return <InnerTimeTracking />;
}
