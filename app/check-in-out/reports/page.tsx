"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import CheckInOutCharts from "@/components/time-tracking/CheckInOutCharts";
import CheckInOutTable from "@/components/time-tracking/CheckInOutTable";

interface ReportData {
  summary: {
    totalEmployees: number;
    checkedIn: number;
    checkedOut: number;
    averageWorkHours: number;
    averageAttendance: number;
    overtimeCount: number;
    lateCheckInCount: number;
  };
  roleStats: Record<string, any>;
  topPerformers: any[];
  needsAttention: any[];
}

export default function CheckInOutReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [selectedRole, setSelectedRole] = useState<"all" | "admin" | "hr" | "manager" | "employee">("all");
  const [reportType, setReportType] = useState<"summary" | "detailed" | "comparison">("summary");
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    fetchReport();
  }, [period, selectedRole, startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        period,
        ...(selectedRole !== "all" && { role: selectedRole }),
        startDate,
        endDate
      });

      const response = await fetch(`/api/checkin-checkout/stats?${params}`);
      const data = await response.json();

      if (data.success) {
        setReport(data.data);
      } else {
        setError(data.message || "Failed to fetch report");
      }
    } catch (err) {
      console.error("Error fetching report:", err);
      setError("Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!report) return;

    const csv = [
      ["Check-In/Check-Out Report", format(new Date(), "MMM dd, yyyy")],
      ["Period", `${startDate} to ${endDate}`],
      ["Role Filter", selectedRole === "all" ? "All Roles" : selectedRole.toUpperCase()],
      [],
      ["SUMMARY"],
      ["Total Employees", report.summary.totalEmployees],
      ["Currently Checked In", report.summary.checkedIn],
      ["Checked Out", report.summary.checkedOut],
      ["Average Work Hours", report.summary.averageWorkHours.toFixed(2)],
      ["Average Attendance %", report.summary.averageAttendance.toFixed(1)],
      ["Late Check-ins", report.summary.lateCheckInCount],
      ["Overtime Count", report.summary.overtimeCount],
      [],
      ["ROLE BREAKDOWN"],
      ...Object.entries(report.roleStats || {}).map(([role, stats]: [string, any]) => [
        role,
        stats.count,
        stats.totalHours?.toFixed(2) || "0"
      ])
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checkin-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-red-700/50 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Check-In/Out Reports</h1>
            <p className="mt-1 text-slate-400">
              Comprehensive attendance and work hour analytics with role-based insights
            </p>
          </div>
          <button
            onClick={exportReport}
            className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
          >
            📊 Export CSV
          </button>
        </div>

        {/* Report Controls */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-100"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Filter by Role</label>
              <select
                value={selectedRole}
                onChange={(e) =>
                  setSelectedRole(e.target.value as "all" | "admin" | "hr" | "manager" | "employee")
                }
                className="w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-100"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="hr">HR</option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
              </select>
            </div>

            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-100"
              >
                <option value="summary">Summary</option>
                <option value="detailed">Detailed</option>
                <option value="comparison">Comparison</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Report */}
        {reportType === "summary" && (
          <div className="space-y-6">
            {/* Key Metrics */}
            {loading ? (
              <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 rounded-lg border border-slate-700 bg-slate-800/50 animate-pulse" />
                ))}
              </div>
            ) : (
              report && (
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                    <p className="text-sm text-slate-400">Total Employees</p>
                    <p className="mt-2 text-3xl font-bold text-slate-100">
                      {report.summary.totalEmployees}
                    </p>
                  </div>

                  <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                    <p className="text-sm text-green-400">Currently Checked In</p>
                    <p className="mt-2 text-3xl font-bold text-green-300">
                      {report.summary.checkedIn}
                    </p>
                  </div>

                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                    <p className="text-sm text-blue-400">Avg Work Hours</p>
                    <p className="mt-2 text-3xl font-bold text-blue-300">
                      {report.summary.averageWorkHours.toFixed(1)}h
                    </p>
                  </div>

                  <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
                    <p className="text-sm text-yellow-400">Avg Attendance</p>
                    <p className="mt-2 text-3xl font-bold text-yellow-300">
                      {report.summary.averageAttendance.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )
            )}

            {/* Role Statistics Table */}
            {report && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                  <h2 className="text-lg font-semibold text-slate-200">By Role</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/50 border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-slate-300">Role</th>
                        <th className="px-4 py-2 text-center font-medium text-slate-300">Records</th>
                        <th className="px-4 py-2 text-center font-medium text-slate-300">Total Hours</th>
                        <th className="px-4 py-2 text-center font-medium text-slate-300">Avg Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {Object.entries(report.roleStats || {}).map(([role, stats]: [string, any]) => (
                        <tr key={role} className="hover:bg-slate-700/50">
                          <td className="px-4 py-2 capitalize font-medium text-slate-100">{role}</td>
                          <td className="px-4 py-2 text-center text-slate-300">{stats.count}</td>
                          <td className="px-4 py-2 text-center text-slate-300">
                            {stats.totalHours?.toFixed(1) || "0"}h
                          </td>
                          <td className="px-4 py-2 text-center text-slate-300">
                            {stats.count > 0
                              ? ((stats.totalHours || 0) / stats.count).toFixed(1)
                              : "0"}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detailed Report */}
        {reportType === "detailed" && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-200">Detailed Records</h2>
              <CheckInOutTable
                role={selectedRole !== "all" ? selectedRole : undefined}
                startDate={startDate}
                endDate={endDate}
                pageSize={50}
              />
            </div>
          </div>
        )}

        {/* Comparison Report */}
        {reportType === "comparison" && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-200">Analytics & Trends</h2>
              <CheckInOutCharts
                period={
                  period === "month"
                    ? "month"
                    : period === "quarter"
                    ? "quarter"
                    : "year"
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
