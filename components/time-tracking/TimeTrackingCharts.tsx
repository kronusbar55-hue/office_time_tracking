"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface WeeklyPoint {
  day: string;
  work: number;
  break: number;
  workedHours?: number;
  breakHours?: number;
}

interface MonthlyPoint {
  date: number;
  workedHours: number;
}

interface DistributionData {
  workedHours: number;
  breakHours: number;
  overtimeHours: number;
}

interface SummaryPoint {
  name: string;
  value: number;
  color: string;
}

const CHART_COLORS = {
  work: "#34d399",
  break: "#fbbf24",
  overtime: "#fb7185",
};

export default function TimeTrackingCharts({ refreshKey }: { refreshKey?: number }) {
  const [weeklyData, setWeeklyData] = useState<WeeklyPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([]);
  const [distributionData, setDistributionData] = useState<DistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [weeklyRes, monthlyRes, distributionRes] = await Promise.all([
          fetch("/api/time-tracking/weekly"),
          fetch("/api/time-tracking/monthly"),
          fetch("/api/time-tracking/distribution?range=week"),
        ]);

        if (weeklyRes.ok) {
          const arr = await weeklyRes.json();
          setWeeklyData(Array.isArray(arr) ? arr : []);
        } else {
          setWeeklyData([]);
        }

        if (monthlyRes.ok) {
          const arr = await monthlyRes.json();
          setMonthlyData(Array.isArray(arr) ? arr : []);
        } else {
          setMonthlyData([]);
        }

        if (distributionRes.ok) {
          const s = await distributionRes.json();
          setDistributionData({
            workedHours: s.workedHours ?? 0,
            breakHours: s.breakHours ?? 0,
            overtimeHours: s.overtimeHours ?? 0,
          });
        } else {
          setDistributionData(null);
        }
      } catch (e) {
        console.error("Failed to fetch chart data:", e);
        setError("Failed to load analytics");
        setWeeklyData([]);
        setMonthlyData([]);
        setDistributionData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [refreshKey]);

  const pieData = useMemo((): SummaryPoint[] => {
    if (!distributionData) return [];
    const { workedHours, breakHours, overtimeHours } = distributionData;
    const total = workedHours + breakHours + overtimeHours;
    if (total === 0) return [{ name: "No time logs", value: 1, color: "#64748b" }];
    return [
      { name: "Work", value: Math.round(workedHours * 100) / 100, color: CHART_COLORS.work },
      { name: "Break", value: Math.round(breakHours * 100) / 100, color: CHART_COLORS.break },
      { name: "Overtime", value: Math.round(overtimeHours * 100) / 100, color: CHART_COLORS.overtime },
    ].filter((d) => d.value > 0);
  }, [distributionData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex h-64 animate-pulse items-center justify-center rounded-xl border border-white/10 bg-slate-900/40">
          <p className="text-slate-400">Loading charts...</p>
        </div>
        <div className="flex h-64 animate-pulse items-center justify-center rounded-xl border border-white/10 bg-slate-900/40">
          <p className="text-slate-400">Loading productivity data...</p>
        </div>
        <div className="flex h-56 animate-pulse items-center justify-center rounded-xl border border-white/10 bg-slate-900/40">
          <p className="text-slate-400">Loading distribution...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Graph 1: Daily Work vs Break (Bar) */}
      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-100">Daily Work vs Break</h3>
        <div className="h-64">
          {weeklyData.length === 0 ? (
            <EmptyChart message="No time logs this week. Clock in to start tracking." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}h`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                  formatter={(v: number | undefined, name: string | undefined) => [
                    `${Number(v).toFixed(2)}h`,
                    name === "work" ? "Work" : "Break",
                  ]}
                />
                <Bar dataKey="work" fill={CHART_COLORS.work} radius={[4, 4, 0, 0]} name="Work" />
                <Bar dataKey="break" fill={CHART_COLORS.break} radius={[4, 4, 0, 0]} name="Break" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Graph 2: Monthly Productivity Trend (Line) */}
      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-100">Monthly Productivity Trend</h3>
        <div className="h-64">
          {monthlyData.length === 0 ? (
            <EmptyChart message="No time logs this month." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}h`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                  formatter={(v: number | undefined) => [`${Number(v).toFixed(2)}h`, "Worked"]}
                />
                <Line
                  type="monotone"
                  dataKey="workedHours"
                  stroke={CHART_COLORS.work}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.work }}
                  name="Hours"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Graph 3: Work Distribution (Pie) */}
      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-100">Work Distribution (This Week)</h3>
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center">
          <div className="h-56 w-56">
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
                    borderRadius: "8px",
                  }}
                  formatter={(v: number | undefined, name: string | undefined) => [
                    typeof v === "number" ? `${v.toFixed(2)}h` : String(v),
                    name,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        {distributionData && (
          <div className="mt-4 flex flex-wrap justify-center gap-6 text-sm">
            <span className="text-emerald-400">
              Work: {distributionData.workedHours.toFixed(1)}h
            </span>
            <span className="text-amber-400">
              Break: {distributionData.breakHours.toFixed(1)}h
            </span>
            <span className="text-rose-400">
              Overtime: {distributionData.overtimeHours.toFixed(1)}h
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-slate-900/20">
      <p className="text-center text-sm text-slate-500">{message}</p>
    </div>
  );
}
