"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Download, RefreshCw, FileSpreadsheet } from "lucide-react";

type ReportStats = {
  totalWorkHours: number;
  totalBreakHours: number;
  presentDays: number;
  avgDailyHours: number;
};

type ByDay = {
  date: string;
  label: string;
  workHours: number;
  breakHours: number;
};

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  technology: string;
  workHours: number;
  breakHours: number;
  presentDays: number;
  attendance: number;
  productivity: number;
};

type ReportData = {
  stats: ReportStats;
  byDay: ByDay[];
  employees: EmployeeRow[];
  range: { start: string; end: string };
};

const CHART_COLORS = { work: "#3b82f6", break: "#64748b" };

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [technologies, setTechnologies] = useState<Array<{ id: string; name: string }>>([]);
  const [employeeId, setEmployeeId] = useState("all");
  const [technologyId, setTechnologyId] = useState("all");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        employeeId,
        technology: technologyId
      });
      const res = await fetch(`/api/reports/insights?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load report");
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, employeeId, technologyId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [usersRes, techRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/technologies")
        ]);
        if (usersRes.ok) {
          const users = await usersRes.json();
          setEmployees(
            (users || []).map((u: { id: string; firstName: string; lastName: string }) => ({
              id: u.id,
              firstName: u.firstName,
              lastName: u.lastName
            }))
          );
        }
        if (techRes.ok) {
          const techs = await techRes.json();
          setTechnologies((techs || []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
        }
      } catch {
        // ignore
      }
    }
    void loadOptions();
  }, []);

  const filteredEmployees = (data?.employees || []).filter(
    (e) =>
      !searchQuery ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    if (!data?.employees?.length) return;
    const headers = ["Employee", "Email", "Department", "Work Hours", "Break Hours", "Present Days", "Attendance %", "Productivity %"];
    const rows = data.employees.map((e) =>
      [e.name, e.email, e.technology, e.workHours, e.breakHours, e.presentDays, e.attendance, e.productivity].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${data.range.start}-${data.range.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const pieData =
    data
      ? (() => {
          const arr = [
            { name: "Work", value: data.stats.totalWorkHours, color: CHART_COLORS.work },
            { name: "Break", value: data.stats.totalBreakHours, color: CHART_COLORS.break }
          ].filter((d) => d.value > 0);
          if (arr.length === 0) {
            return [{ name: "No data", value: 1, color: "#64748b" }];
          }
          return arr;
        })()
      : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Weekly Insights</h1>
          <p className="mt-1 text-sm text-slate-400">
            Detailed analysis of productivity over the selected period, based on tracked sessions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchReport()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="filter-group">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Employee
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
            >
              <option value="all">All Employees</option>
              {employees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Department
            </label>
            <select
              value={technologyId}
              onChange={(e) => setTechnologyId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
            >
              <option value="all">All Departments</option>
              {technologies.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-accent/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Work Hours</p>
                  <p className="mt-2 text-2xl font-bold text-slate-50">{data.stats.totalWorkHours}h</p>
                  <p className="mt-1 text-xs text-slate-500">Across selected period</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-lg">⏱️</div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-accent/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Break Time</p>
                  <p className="mt-2 text-2xl font-bold text-slate-50">{data.stats.totalBreakHours}h</p>
                  <p className="mt-1 text-xs text-slate-500">Sum of all breaks</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-lg">☕</div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-accent/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Present Days</p>
                  <p className="mt-2 text-2xl font-bold text-slate-50">{data.stats.presentDays}</p>
                  <p className="mt-1 text-xs text-slate-500">Days with activity</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-lg">📅</div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-accent/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Daily Hours</p>
                  <p className="mt-2 text-2xl font-bold text-slate-50">{data.stats.avgDailyHours}h</p>
                  <p className="mt-1 text-xs text-slate-500">Per day average</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-lg">📊</div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-base font-semibold text-slate-100">Hours Tracked</h3>
              <p className="text-xs text-slate-500">Daily work hours for the selected period</p>
              <div className="mt-4 h-64">
                {data.byDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.byDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}h`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px"
                        }}
                        formatter={(v: number | undefined) => [`${Number(v).toFixed(2)}h`, "Work"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="workHours"
                        stroke={CHART_COLORS.work}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.work }}
                        name="Work Hours"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    No data for selected period
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-base font-semibold text-slate-100">Time Distribution</h3>
              <p className="text-xs text-slate-500">Work vs Break time</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px"
                      }}
                      formatter={(v: number | undefined, name: string) =>
                        [typeof v === "number" ? `${v.toFixed(2)}h` : v, name]
                      }
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="flex flex-col gap-4 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-slate-100">Employee Performance</h3>
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-accent focus:outline-none"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Hours This Week
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Attendance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Productivity
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                        No employees match your filters
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="transition hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-cyan-400 text-sm font-semibold text-slate-900">
                              {getInitials(emp.name)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-100">{emp.name}</p>
                              <p className="text-xs text-slate-500">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-100">{emp.workHours}h</span>
                          <span className="ml-1 text-xs text-slate-500">/ {emp.breakHours}h break</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-200">{emp.attendance}%</span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.min(emp.attendance, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-200">{emp.productivity}%</span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${Math.min(emp.productivity, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Export Report</h3>
              <button
                onClick={() => setExportOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                ×
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Download the employee performance data as CSV.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleExportCSV}
                disabled={!data?.employees?.length}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-900 transition hover:brightness-110 disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download CSV
              </button>
              <button
                onClick={() => setExportOpen(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
