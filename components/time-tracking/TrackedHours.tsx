"use client";

import { useEffect, useState } from "react";

interface MonthlyStats {
  date: string; // "2025-02-01"
  workedMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
}

type ViewMode = "day" | "week" | "month";

export default function TrackedHours() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [stats, setStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalWorked, setTotalWorked] = useState(0);
  const [totalBreaks, setTotalBreaks] = useState(0);
  const [totalOvertime, setTotalOvertime] = useState(0);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const res = await fetch(`/api/time-entries/stats?period=${viewMode}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats || []);
          setTotalWorked(data.totalWorkedMinutes || 0);
          setTotalBreaks(data.totalBreakMinutes || 0);
          setTotalOvertime(data.totalOvertimeMinutes || 0);
        }
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [viewMode]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getMaxHours = () => {
    if (stats.length === 0) return 12;
    const max = Math.max(...stats.map((s) => s.workedMinutes / 60));
    return Math.ceil(max / 2) * 2;
  };

  const getDayLabels = () => {
    return stats.map((s) => {
      const date = new Date(s.date + "T00:00:00");
      if (viewMode === "month") {
        return date.getDate().toString();
      }
      return date.toLocaleDateString("en-US", { weekday: "short" });
    });
  };

  const maxHeight = getMaxHours();

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Tracked Hours</h2>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 hover:bg-slate-100 transition">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-xs text-slate-600 uppercase font-semibold tracking-wide">Worked Hours</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {formatDuration(totalWorked)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 hover:bg-slate-100 transition">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-slate-600 uppercase font-semibold tracking-wide">Breaks</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {formatDuration(totalBreaks)}
          </p>
        </div>

        {/* <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 hover:bg-slate-100 transition">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-xs text-slate-600 uppercase font-semibold tracking-wide">Overtime Hours</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {formatDuration(totalOvertime)}
          </p>
        </div> */}
      </div>
      

      {/* View Mode Tabs */}
      <div className="mb-8 flex gap-6 border-b border-slate-200 pb-0">
        {(["day", "week", "month"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`py-3 px-0 text-sm font-medium transition-colors border-b-2 ${
              viewMode === mode
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex h-80 items-center justify-center text-slate-500">
          <p className="text-sm">Loading...</p>
        </div>
      ) : stats.length === 0 ? (
        <div className="flex h-80 items-center justify-center text-slate-500">
          <p className="text-sm">No data available</p>
        </div>
      ) : (
        <div>
          <div className="flex h-80 items-end justify-between gap-2 pb-4">
            {stats.map((stat, idx) => {
              const workedHours = stat.workedMinutes / 60;
              const breakHours = stat.breakMinutes / 60;
              const workPercent = (workedHours / maxHeight) * 100;
              const breakPercent = (breakHours / (workedHours || 0)) * 100;

              return (
                <div
                  key={stat.date}
                  className="flex flex-1 flex-col items-center gap-3"
                >
                  <div className="relative flex w-full flex-col justify-end gap-0" style={{ height: "200px" }}>
                    <div className="flex flex-1 items-end justify-center gap-1 w-full">
                      {workedHours > 0 && (
                        <div className="flex flex-1 flex-col items-center h-full">
                          <div
                            className="w-2/3 bg-green-500 rounded-t"
                            style={{ height: `${workPercent}%` }}
                          />
                        </div>
                      )}
                      {breakHours > 0 && (
                        <div className="flex flex-1 flex-col items-center h-full">
                          <div
                            className="w-2/3 bg-yellow-500 rounded-t"
                            style={{ height: `${Math.min((breakPercent / 100) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    {getDayLabels()[idx]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-600">
              💡 Does not include manually entered payroll hours
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
