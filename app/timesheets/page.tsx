"use client";

import { useState } from "react";
import { format } from "date-fns";
import { TimesheetHeader } from "@/components/timesheets/TimesheetHeader";
import { DateNavigator } from "@/components/timesheets/DateNavigator";
import { DailyView } from "@/components/timesheets/DailyView";
import { WeeklyView } from "@/components/timesheets/WeeklyView";
import { MonthlyView } from "@/components/timesheets/MonthlyView";

type ViewType = "daily" | "weekly" | "monthly";
type TabType = "timesheets" | "approvals";

export default function TimesheetsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("timesheets");
  const [viewType, setViewType] = useState<ViewType>("monthly");
  const [currentDate, setCurrentDate] = useState(format(new Date(), "yyyy-MM-dd"));

  return (
    <div className="min-h-screen bg-white py-8 px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Tabs */}
        <TimesheetHeader activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content */}
        {activeTab === "timesheets" && (
          <div className="space-y-6">
            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* View Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">
                  View:
                </label>
                <select
                  value={viewType}
                  onChange={(e) => setViewType(e.target.value as ViewType)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 hover:border-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-0"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Date Navigator */}
              <DateNavigator
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                viewType={viewType}
              />
            </div>

            {/* Views */}
            <div>
              {viewType === "daily" && <DailyView date={currentDate} />}
              {viewType === "weekly" && <WeeklyView date={currentDate} />}
              {viewType === "monthly" && <MonthlyView date={currentDate} />}
            </div>
          </div>
        )}

        {/* Approvals Tab Placeholder */}
        {activeTab === "approvals" && (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-500">Approvals section coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}

