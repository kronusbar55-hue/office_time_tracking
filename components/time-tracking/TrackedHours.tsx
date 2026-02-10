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
    <div className="rounded-lg border border-slate-800/40 bg-slate-900/40 p-6">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-50">TRACKED HOURS</h2>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-md border border-slate-800/40 bg-slate-950/40 p-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400 uppercase">Worked Hours</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-slate-50">
            {formatDuration(totalWorked)}
          </p>
        </div>

        <div className="rounded-md border border-slate-800/40 bg-slate-950/40 p-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-400 uppercase">Breaks</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-slate-50">
            {formatDuration(totalBreaks)}
          </p>
        </div>

        <div className="rounded-md border border-slate-800/40 bg-slate-950/40 p-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-rose-500" />
            <span className="text-xs text-slate-400 uppercase">Overtime Hours</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-slate-50">
            {formatDuration(totalOvertime)}
          </p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-800/40 pb-2">
        {(["day", "week", "month"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === mode
                ? "border-b-2 border-accent text-accent"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          Loading...
        </div>
      ) : stats.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          No data available
        </div>
      ) : (
        <div>
          <div className="flex h-64 items-end justify-between gap-1">
            {stats.map((stat, idx) => {
              const workedHours = stat.workedMinutes / 60;
              const breakHours = stat.breakMinutes / 60;
              const workPercent = (workedHours / maxHeight) * 100;
              const breakPercent = (breakHours / (workedHours || 0)) * 100;

              return (
                <div
                  key={stat.date}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div className="relative flex w-full flex-col justify-end gap-0.5" style={{ height: "200px" }}>
                    <div className="flex flex-1 items-end justify-center gap-0.5">
                      {workedHours > 0 && (
                        <div className="flex flex-1 flex-col items-center">
                          <div
                            className="w-3/4 bg-emerald-500 rounded-t-sm"
                            style={{ height: `${workPercent}%` }}
                          />
                        </div>
                      )}
                      {breakHours > 0 && (
                        <div className="flex flex-1 flex-col items-center">
                          <div
                            className="w-3/4 bg-amber-500 rounded-t-sm"
                            style={{ height: `${Math.min((breakPercent / 100) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">
                    {getDayLabels()[idx]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-slate-800/40 pt-4">
            <p className="text-xs text-slate-400">
              💡 Does not include manually entered payroll hours
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 text-center">
        <button className="text-xs text-accent hover:underline">
          ⚙️ Configure widgets
        </button>
      </div>
    </div>
  );
}
