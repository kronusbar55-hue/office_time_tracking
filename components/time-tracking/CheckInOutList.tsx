"use client";

import React, { useEffect, useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";

interface CheckInOutRecord {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    avatarUrl?: string;
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

interface CheckInOutListProps {
  role?: string;
  period?: "today" | "week" | "month";
  limit?: number;
}

export default function CheckInOutList({ role, period = "today", limit = 50 }: CheckInOutListProps) {
  const [records, setRecords] = useState<CheckInOutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "time" | "hours">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          sortBy,
          sortOrder,
          ...(role && { role })
        });

        const response = await fetch(`/api/checkin-checkout/list?${params}`);
        const data = await response.json();

        if (data.success) {
          setRecords(data.data.data || []);
        } else {
          setError(data.message || "Failed to fetch records");
        }
      } catch (err) {
        console.error("Error fetching records:", err);
        setError("Failed to fetch check-in/out records");
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [role, period, limit, sortBy, sortOrder]);

  const statusChip = (record: CheckInOutRecord) => {
    if (!record.clockOut) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-300">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
          Checked In
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-600/50 px-2 py-1 text-xs font-medium text-slate-300">
        Checked Out
      </span>
    );
  };

  const issueIndicators = (record: CheckInOutRecord) => {
    return (
      <div className="flex flex-wrap gap-1">
        {record.isLateCheckIn && (
          <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-300">Late</span>
        )}
        {record.isEarlyCheckOut && (
          <span className="rounded bg-orange-500/20 px-2 py-0.5 text-xs text-orange-300">Early Out</span>
        )}
        {record.isOvertime && (
          <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">OT</span>
        )}
        {record.attendancePercentage < 80 && (
          <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-300">Low</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg border border-slate-700 bg-slate-800/50 animate-pulse" />
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

  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center text-slate-400">
        No check-in/out records found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sort Controls */}
      <div className="flex gap-2 mb-4">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 rounded border border-slate-600 bg-slate-800 text-sm text-slate-100"
        >
          <option value="date">Sort by Date</option>
          <option value="time">Sort by Time</option>
          <option value="hours">Sort by Hours</option>
        </select>
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="px-3 py-2 rounded border border-slate-600 bg-slate-800 text-sm text-slate-100 hover:bg-slate-700"
        >
          {sortOrder === "asc" ? "↑" : "↓"}
        </button>
      </div>

      {/* Records */}
      {Array.isArray(records) ? (
        records.map((record) => (
          <div
            key={record._id}
            className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800"
          >
            <div className="flex items-center justify-between gap-4">
              {/* User Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-slate-700 flex-shrink-0">
                  {record.user.avatarUrl && (
                    <img src={record.user.avatarUrl} alt={record.user.firstName} className="w-full h-full rounded-full" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-100 truncate">
                    {record.user.firstName} {record.user.lastName}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{record.user.email}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex-shrink-0">{statusChip(record)}</div>
            </div>

            {/* Details */}
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-400">Clock In</p>
                <p className="text-slate-100">
                  {new Date(record.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {record.clockOut && (
                <div>
                  <p className="text-slate-400">Clock Out</p>
                  <p className="text-slate-100">
                    {new Date(record.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-slate-400">Work Hours</p>
                <p className="text-slate-100">{(record.workMinutes / 60).toFixed(2)}h</p>
              </div>
              <div>
                <p className="text-slate-400">Attendance %</p>
                <p className={record.attendancePercentage >= 100 ? "text-green-400" : "text-yellow-400"}>
                  {record.attendancePercentage}%
                </p>
              </div>
            </div>

            {/* Issues */}
            {(record.isLateCheckIn || record.isEarlyCheckOut || record.isOvertime) && (
              <div className="mt-3 pt-3 border-t border-slate-700">{issueIndicators(record)}</div>
            )}
          </div>
        ))
      ) : (
        <div className="rounded-lg border border-yellow-700/50 bg-yellow-500/5 p-4 text-sm text-yellow-300">
          Unexpected records format
        </div>
      )}
    </div>
  );
}
