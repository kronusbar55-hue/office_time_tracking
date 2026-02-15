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

      <div className="flex gap-8 text-sm">
        <button
          onClick={() => onTabChange("timesheets")}
          className={`pb-4 font-medium transition-colors ${
            activeTab === "timesheets"
              ? "border-b-2 border-orange-500 text-orange-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Timesheets
        </button>
        <button
          onClick={() => onTabChange("approvals")}
          className={`pb-4 font-medium transition-colors ${
            activeTab === "approvals"
              ? "border-b-2 border-orange-500 text-orange-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Approvals
        </button>
      </div>
    </div>
  );
}
