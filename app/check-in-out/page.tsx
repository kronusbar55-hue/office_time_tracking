"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import CheckInOutStatCards from "@/components/time-tracking/CheckInOutStatCards";
import CheckInOutList from "@/components/time-tracking/CheckInOutList";
import CheckInOutCharts from "@/components/time-tracking/CheckInOutCharts";
import CheckInOutTable from "@/components/time-tracking/CheckInOutTable";

export default function CheckInOutPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");
  const [viewMode, setViewMode] = useState<"summary" | "detailed" | "analytics">("summary");
  const userRole = user?.role || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Check-In / Check-Out</h1>
          <p className="mt-1 text-slate-400">
            Monitor employee attendance, work hours, and generate comprehensive reports
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod("today")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === "today"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod("week")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === "week"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod("month")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === "month"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              This Month
            </button>
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setViewMode("summary")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === "summary"
                  ? "bg-green-600 text-white"
                  : "border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode("detailed")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === "detailed"
                  ? "bg-green-600 text-white"
                  : "border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("analytics")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === "analytics"
                  ? "bg-green-600 text-white"
                  : "border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        {/* Summary View */}
        {viewMode === "summary" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-200">Key Performance Indicators</h2>
              <CheckInOutStatCards period={period} />
            </div>

            {/* Quick List */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-200">Recent Check-Ins</h2>
              <CheckInOutList period={period} limit={10} />
            </div>
          </div>
        )}

        {/* Detailed View */}
        {viewMode === "detailed" && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-200">Detailed Records</h2>
              <CheckInOutTable pageSize={25} />
            </div>
          </div>
        )}

        {/* Analytics View */}
        {viewMode === "analytics" && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-200">Analytics & Reports</h2>
              <CheckInOutCharts period={period as any} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
