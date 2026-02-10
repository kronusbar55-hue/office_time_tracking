 "use client";

import { useEffect, useMemo, useState } from "react";

type WeeklyReport = {
  range: {
    start: string;
    end: string;
  };
  totals: {
    totalMinutes: number;
    avgSessionMinutes: number;
    sessions: number;
    tasksCompleted: number;
  };
  byDay: { date: string; totalMinutes: number }[];
};

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ReportsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Array<any>>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) return;
        const list = await res.json();
        setEmployees(list || []);
        if (list && list.length > 0 && !employeeId) setEmployeeId(list[0].id);
      } catch (e) {
        // ignore
      }
    }

    void loadEmployees();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (!employeeId) {
          setData(null);
          return;
        }
        const params = new URLSearchParams({
          employeeId,
          startDate,
          endDate
        });
        const res = await fetch(`/api/reports/weekly?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Unable to load report");
        }
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
        setError("Could not load report.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [employeeId, startDate, endDate]);

  const bars = useMemo(() => {
    if (!data || !Array.isArray(data.byDay)) return [];
    const map = new Map<string, number>();
    data.byDay.forEach((d: any) => map.set(d.date, d.totalWorkMinutes ?? 0));

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days: { label: string; minutes: number }[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const label = dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1];
      days.push({ label, minutes: map.get(key) ?? 0 });
    }
    return days;
  }, [data, startDate, endDate]);

  const maxMinutes = bars.reduce((max, b) => (b.minutes > max ? b.minutes : max), 0);

  const totalWorkHours = data && data.totals && typeof data.totals.totalWorkMinutes === 'number'
    ? (data.totals.totalWorkMinutes / 60).toFixed(2)
    : null;
  const totalBreakHours = data && data.totals && typeof data.totals.totalBreakMinutes === 'number'
    ? (data.totals.totalBreakMinutes / 60).toFixed(2)
    : null;
  const presentDays = data && data.totals && typeof data.totals.presentDays === 'number'
    ? data.totals.presentDays
    : null;

  return (
    <div className="space-y-4">
      <h1 className="text-sm font-semibold text-slate-50">Weekly Insights</h1>
      <p className="text-xs text-slate-400">
        Detailed analysis of your productivity over the last 7 days, based on
        your tracked sessions.
      </p>

      {error && (
        <p className="rounded-md border border-rose-700 bg-rose-950/60 px-3 py-2 text-[11px] text-rose-100">
          {error}
        </p>
      )}
      <section className="grid gap-4 md:grid-cols-3">
        {loading ? (
          <>
            <div className="rounded-xl border border-slate-800 bg-card/80 p-4 shadow-card">
              <div className="h-4 w-1/3 rounded bg-slate-700/40 animate-pulse" />
              <div className="mt-3 h-8 w-1/2 rounded bg-slate-700/40 animate-pulse" />
              <div className="mt-2 h-3 w-3/4 rounded bg-slate-700/30 animate-pulse" />
            </div>
            <div className="rounded-xl border border-slate-800 bg-card/80 p-4 shadow-card">
              <div className="h-4 w-1/3 rounded bg-slate-700/40 animate-pulse" />
              <div className="mt-3 h-8 w-1/2 rounded bg-slate-700/40 animate-pulse" />
              <div className="mt-2 h-3 w-3/4 rounded bg-slate-700/30 animate-pulse" />
            </div>
            <div className="rounded-xl border border-slate-800 bg-card/80 p-4 shadow-card">
              <div className="h-4 w-1/3 rounded bg-slate-700/40 animate-pulse" />
              <div className="mt-3 h-8 w-1/2 rounded bg-slate-700/40 animate-pulse" />
              <div className="mt-2 h-3 w-3/4 rounded bg-slate-700/30 animate-pulse" />
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-slate-800 bg-card/80 p-4 shadow-card">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Total Work Hours</p>
              <p className="mt-3 text-2xl font-semibold text-slate-50">{totalWorkHours ? `${totalWorkHours}h` : '-'}</p>
              <p className="mt-1 text-[11px] text-slate-500">Across {data?.totals?.sessions ?? '-'} tracked sessions.</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-card/80 p-4 shadow-card">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Total Break Time</p>
              <p className="mt-3 text-2xl font-semibold text-slate-50">{totalBreakHours ? `${totalBreakHours}h` : '-'}</p>
              <p className="mt-1 text-[11px] text-slate-500">Sum of all break periods in range.</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-card/80 p-4 shadow-card">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Present Days</p>
              <p className="mt-3 text-2xl font-semibold text-slate-50">{presentDays !== null ? presentDays : '-'}</p>
              <p className="mt-1 text-[11px] text-slate-500">Distinct days with activity in range.</p>
            </div>
          </>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        <label className="text-sm text-slate-300">Employee:</label>
        <select
          value={employeeId ?? ''}
          onChange={(e) => setEmployeeId(e.target.value)}
          disabled={loading}
          className={`rounded border border-slate-700 bg-slate-900 text-slate-200 px-3 py-1 text-sm min-w-[200px] ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {employees.map((u) => (
            <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">{u.firstName} {u.lastName}</option>
          ))}
        </select>

        <label className="text-sm text-slate-300 ml-2">Start</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          disabled={loading}
          className={`rounded border border-slate-700 bg-slate-900 text-slate-200 px-2 py-1 text-sm ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        />

        <label className="text-sm text-slate-300 ml-2">End</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          disabled={loading}
          className={`rounded border border-slate-700 bg-slate-900 text-slate-200 px-2 py-1 text-sm ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
      </div>

      <section className="rounded-xl border border-slate-800 bg-card/80 p-4 shadow-card">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Hours tracked
        </p>
          <div className="mt-4 flex h-52 items-end gap-4 rounded-lg border border-slate-800/80 bg-slate-950/40 px-4 pb-4 pt-6">
            {loading ? (
              <div className="flex-1 h-full rounded-lg border border-slate-800/60 bg-slate-900/40 p-6">
                <div className="h-full w-full rounded bg-slate-800/40 animate-pulse" />
              </div>
            ) : (
              <> 
                {data && Array.isArray(data.byDay) && data.byDay.length === 0 ? (
                  <div className="w-full py-12 text-center text-slate-500">No reporting data found. Try adjusting your date range or selecting a different user.</div>
                ) : (
                  bars.map((bar) => {
                    const heightPct = maxMinutes > 0 ? Math.round((bar.minutes / maxMinutes) * 100) : 0;
                    return (
                      <div key={bar.label} className="flex flex-1 flex-col items-center justify-end gap-2 text-[11px] text-slate-500">
                        <div className="flex h-full w-full items-end justify-center">
                          <div className="w-5 rounded-full bg-accent/20" style={{ height: `${Math.max(heightPct, 6)}%` }} />
                        </div>
                        <span>{bar.label}</span>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
      </section>
    </div>
  );
}

