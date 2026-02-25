"use client";

import { useEffect, useState } from "react";
import { useTimeTracking } from "./TimeTrackingProvider";

interface MonthlyStats {
  date: string;
  workedMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
}

type ViewMode = "day" | "week" | "month";

export default function TrackedHoursPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [stats, setStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalWorked, setTotalWorked] = useState(0);
  const [totalBreaks, setTotalBreaks] = useState(0);
  const [totalOvertime, setTotalOvertime] = useState(0);
  const { refreshKey } = useTimeTracking();

  const loadStats = async () => {
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
    } catch {
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [viewMode, refreshKey]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const maxHeight = stats.length ? Math.max(8, ...stats.map((s) => s.workedMinutes / 60)) : 12;

  // return (
  // <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-900/40 p-6 backdrop-blur-sm shadow-xl">
  {/* <div className="mb-6">
        <h2 className="text-lg font-bold uppercase tracking-wide text-slate-100">Tracked Hours</h2>
      </div> */}

  {/* <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 transition-shadow hover:shadow-lg">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">Worked</p>
          <p className="text-2xl font-bold text-white">{formatDuration(totalWorked)}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 transition-shadow hover:shadow-lg">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-400">Breaks</p>
          <p className="text-2xl font-bold text-white">{formatDuration(totalBreaks)}</p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 transition-shadow hover:shadow-lg">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-rose-400">Overtime</p>
          <p className="text-2xl font-bold text-white">{formatDuration(totalOvertime)}</p>
        </div>
      </div> */}

  {/* <div className="mb-6 flex gap-2 border-b border-slate-700/50 pb-2">
        {(["day", "week", "month"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${viewMode === mode
                ? "bg-accent text-slate-900"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div> */}

  {/* {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-500">Loading...</div>
      ) : stats.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg bg-slate-800/30 text-slate-500">
          No data available
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex h-48 items-end justify-between gap-2">
            {stats.map((stat, idx) => {
              const workedHours = stat.workedMinutes / 60;
              const workPercent = (workedHours / maxHeight) * 100;
              return (
                <div
                  key={stat.date}
                  className="group flex flex-1 flex-col items-center gap-2"
                  title={`${stat.date}: ${formatDuration(stat.workedMinutes)}`}
                >
                  <div
                    className="w-full max-w-[40px] rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-300 group-hover:from-emerald-500 group-hover:to-emerald-300"
                    style={{ height: `${Math.max(4, workPercent)}%` }}
                  />
                  <span className="text-xs text-slate-400">
                    {viewMode === "month"
                      ? new Date(stat.date + "T00:00:00").getDate()
                      : new Date(stat.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">Hover bars for breakdown</p>
        </div>
      )} */}
  // </div>
  // );
}
