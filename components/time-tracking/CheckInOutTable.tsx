"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";

interface CheckInOutTableRecord {
  _id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  date: string;
  clockIn: string;
  clockOut?: string | null;
  workMinutes: number;
  breakMinutes: number;
  userRole: string;
  isOvertime: boolean;
  isLateCheckIn: boolean;
  isEarlyCheckOut: boolean;
  attendancePercentage: number;
  overtimeMinutes: number;
}

interface CheckInOutTableProps {
  role?: string;
  startDate?: string;
  endDate?: string;
  pageSize?: number;
}

export default function CheckInOutTable({
  role,
  startDate,
  endDate,
  pageSize = 20
}: CheckInOutTableProps) {
  const [records, setRecords] = useState<CheckInOutTableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterRole, setFilterRole] = useState(role || "");
  const [filterStatus, setFilterStatus] = useState<"all" | "checked-in" | "checked-out">("all");

  useEffect(() => {
    fetchRecords();
  }, [currentPage, sortBy, sortOrder, filterRole, filterStatus, startDate, endDate]);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(filterRole && { role: filterRole }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      });

      const response = await fetch(`/api/checkin-checkout/list?${params}`);
      const data = await response.json();

      if (data.success) {
        setRecords(data.data || []);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        setError(data.message || "Failed to fetch records");
      }
    } catch (err) {
      console.error("Error fetching records:", err);
      setError("Failed to fetch records");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm:ss");
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const getStatusBadge = (record: CheckInOutTableRecord) => {
    if (!record.clockOut) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-300">
          <span className="h-2 w-2 rounded-full bg-green-400"></span>
          Checked In
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-600/50 px-3 py-1 text-xs font-medium text-slate-300">
        Checked Out
      </span>
    );
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-700/50 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterRole}
          onChange={(e) => {
            setFilterRole(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 rounded border border-slate-600 bg-slate-800 text-sm text-slate-100"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="hr">HR</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as any);
            setCurrentPage(1);
          }}
          className="px-3 py-2 rounded border border-slate-600 bg-slate-800 text-sm text-slate-100"
        >
          <option value="all">All Status</option>
          <option value="checked-in">Checked In</option>
          <option value="checked-out">Checked Out</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 rounded border border-slate-600 bg-slate-800 text-sm text-slate-100"
        >
          <option value="date">Sort by Date</option>
          <option value="workMinutes">Sort by Hours</option>
          <option value="attendancePercentage">Sort by Attendance</option>
        </select>

        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="px-3 py-2 rounded border border-slate-600 bg-slate-800 text-sm text-slate-100 hover:bg-slate-700"
        >
          {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/50">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-slate-400">Loading records...</div>
          </div>
        ) : !Array.isArray(records) ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-yellow-400">Unexpected records format</div>
          </div>
        ) : records.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-slate-400">No records found</div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-700 bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Clock In</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Clock Out</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300">
                  Work Hours
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300">
                  Attendance %
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300">
                  Issues
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {records.map((record) => (
                <tr
                  key={record._id}
                  className="hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-100">
                        {record.user.firstName} {record.user.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{record.user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {formatDate(record.date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {formatTime(record.clockIn)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {record.clockOut ? formatTime(record.clockOut) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-slate-100">
                    {(Number(record.workMinutes || 0) / 60).toFixed(2)}h
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-sm font-medium ${
                        record.attendancePercentage >= 100
                          ? "text-green-400"
                          : record.attendancePercentage >= 80
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {Number(record.attendancePercentage || 0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(record)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {record.isLateCheckIn && (
                        <span className="rounded text-xs bg-yellow-500/20 px-2 py-1 text-yellow-300">
                          Late
                        </span>
                      )}
                      {record.isEarlyCheckOut && (
                        <span className="rounded text-xs bg-orange-500/20 px-2 py-1 text-orange-300">
                          Early
                        </span>
                      )}
                      {record.isOvertime && (
                        <span className="rounded text-xs bg-blue-500/20 px-2 py-1 text-blue-300">
                          OT
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded border border-slate-600 bg-slate-800 text-sm text-slate-100 disabled:opacity-50"
          >
            Previous
          </button>
          <div className="text-sm text-slate-400">
            Page {currentPage} of {totalPages}
          </div>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded border border-slate-600 bg-slate-800 text-sm text-slate-100 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
