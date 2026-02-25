"use client";

import LiveTimerDisplay from "@/components/time-tracking/LiveTimerDisplay";

interface TimesheetHeaderProps {
  activeTab: "timesheets" | "approvals";
  onTabChange: (tab: "timesheets" | "approvals") => void;
}

export function TimesheetHeader({
  activeTab,
  onTabChange
}: TimesheetHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Timesheets</h1>
        <LiveTimerDisplay />
      </div>


    </div>
  );
}
