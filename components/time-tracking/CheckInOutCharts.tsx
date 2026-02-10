"use client";

import React, { useEffect, useState } from "react";

interface AnalyticsData {
  summary: {
    totalRecords: number;
    totalWorkHours: number;
    totalBreakHours: number;
    totalOvertimeHours: number;
    averageWorkHoursPerDay: number;
    averageAttendanceRate: number;
    uniqueEmployees: number;
  };
  daily: Record<string, { worked: number; count: number; overtime: number }>;
  roleBreakdown: Record<string, { count: number; hours: number; overtime: number }>;
  issues: {
    late: number;
    earlyOut: number;
    overtime: number;
  };
}

interface CheckInOutChartsProps {
  period?: "week" | "month" | "quarter" | "year";
  role?: string;
}

export default function CheckInOutCharts({ period = "month", role }: CheckInOutChartsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ period, ...(role && { role }) });
        const response = await fetch(`/api/checkin-checkout/analytics?${params}`);
        const data = await response.json();

        if (data.success) {
          setData(data.data);
        } else {
          setError(data.message || "Failed to fetch analytics");
        }
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Failed to fetch analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [period, role]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-64 rounded-lg border border-slate-700 bg-slate-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-700/50 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Daily work hours chart
  const dailyDates = data?.daily ? Object.keys(data.daily).sort().slice(-14) : [];
  const maxDailyHours = dailyDates.length > 0 ? Math.max(...dailyDates.map((d) => Number(data.daily[d]?.worked || 0))) : 10;

  // Role breakdown
  const roleEntries = data?.roleBreakdown ? Object.entries(data.roleBreakdown) : [];

  // Issues breakdown
  const totalIssues = (data?.issues?.late || 0) + (data?.issues?.earlyOut || 0) + (data?.issues?.overtime || 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Daily Work Hours */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-200">Daily Work Hours (Last 14 Days)</h3>
        <div className="flex h-40 items-end gap-1 justify-center">
          {dailyDates.map((date) => {
            const hours = Number(data.daily[date]?.worked || 0);
            const height = maxDailyHours > 0 ? (hours / maxDailyHours) * 100 : 0;
            const isOvertime = hours > 9;
            return (
              <div key={date} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-full rounded transition-colors ${
                    isOvertime ? "bg-blue-500" : hours >= 8 ? "bg-green-500" : "bg-yellow-500"
                  }`}
                  style={{ height: `${height}%`, minHeight: "4px" }}
                  title={`${date}: ${hours.toFixed(1)}h`}
                />
                <span className="text-xs text-slate-500">{date.slice(5)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded bg-green-500"></div>
            <span className="text-slate-400">Normal (8h)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded bg-yellow-500"></div>
            <span className="text-slate-400">Partial</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded bg-blue-500"></div>
            <span className="text-slate-400">Overtime</span>
          </div>
        </div>
      </div>

      {/* Role Breakdown */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-200">Hours by Role</h3>
        <div className="space-y-3">
          {roleEntries.map(([roleKey, stats]) => {
            const maxHours = Math.max(...roleEntries.map((e) => e[1].hours), 100);
            const percentage = (stats.hours / maxHours) * 100;
            return (
              <div key={roleKey}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-300 capitalize">{roleKey}</span>
                  <span className="text-slate-400">
                    {stats.hours.toFixed(0)}h ({stats.count} records)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Issues Distribution */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-200">Issues Detected</h3>
        {totalIssues === 0 ? (
          <p className="text-slate-400 text-sm">No issues detected ✓</p>
        ) : (
          <div className="space-y-3">
            {[
              { label: "Late Check-ins", count: data.issues.late, color: "yellow" },
              { label: "Early Check-outs", count: data.issues.earlyOut, color: "orange" },
              { label: "Overtime", count: data.issues.overtime, color: "blue" }
            ].map(({ label, count, color }) => {
              const percentage = (count / totalIssues) * 100;
              const colorClass: Record<string, string> = {
                yellow: "bg-yellow-500",
                orange: "bg-orange-500",
                blue: "bg-blue-500"
              };
              return (
                <div key={label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-300">{label}</span>
                    <span className="text-slate-400">{count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-700">
                    <div
                      className={`h-full rounded-full ${colorClass[color]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-200">Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Unique Employees</span>
            <span className="text-slate-100 font-medium">{data.summary.uniqueEmployees}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total Records</span>
            <span className="text-slate-100 font-medium">{data.summary.totalRecords}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Avg Work Hours/Day</span>
            <span className="text-slate-100 font-medium">
              {(Number(data.summary?.averageWorkHoursPerDay) || 0).toFixed(1)}h
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total Overtime</span>
            <span className="text-blue-400 font-medium">
              {(Number(data.summary?.totalOvertimeHours) || 0).toFixed(1)}h
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
            <span className="text-slate-400">Avg Attendance Rate</span>
            <span className={`font-medium ${(Number(data.summary?.averageAttendanceRate) || 0) >= 80 ? "text-green-400" : "text-red-400"}`}>
              {(Number(data.summary?.averageAttendanceRate) || 0).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
