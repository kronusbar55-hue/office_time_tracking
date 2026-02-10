"use client";

import { format } from "date-fns";
import { MoreVertical } from "lucide-react";
import type { AttendanceRecord } from "@/app/api/attendance/route";
import { StatusBadge } from "./StatusBadge";
import { useState } from "react";

interface AttendanceTableProps {
  records: AttendanceRecord[];
  isLoading?: boolean;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

const ITEMS_PER_PAGE = 10;

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getAvatarColor(userId: string): string {
  const colors = [
    "bg-purple-500",
    "bg-blue-500",
    "bg-pink-500",
    "bg-green-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-indigo-500",
    "bg-cyan-500"
  ];
  const hash = userId.charCodeAt(0) + userId.charCodeAt(userId.length - 1);
  return colors[hash % colors.length];
}

export function AttendanceTable({
  records,
  isLoading = false,
  currentPage = 1,
  pageSize = ITEMS_PER_PAGE,
  onPageChange
}: AttendanceTableProps) {
  const totalPages = Math.ceil(records.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const paginatedRecords = records.slice(startIdx, endIdx);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-400">Loading attendance data...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-card/70 p-12 text-center">
        <p className="text-slate-400">No attendance records found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-card/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/50">
              <th className="px-4 py-3 text-left font-medium uppercase text-slate-400 text-xs">
                Employee
              </th>
              <th className="px-4 py-3 text-left font-medium uppercase text-slate-400 text-xs">
                Role / Department
              </th>
              <th className="px-4 py-3 text-left font-medium uppercase text-slate-400 text-xs">
                Check-In
              </th>
              <th className="px-4 py-3 text-left font-medium uppercase text-slate-400 text-xs">
                Check-Out
              </th>
              <th className="px-4 py-3 text-left font-medium uppercase text-slate-400 text-xs">
                Working Hours
              </th>
              <th className="px-4 py-3 text-left font-medium uppercase text-slate-400 text-xs">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium uppercase text-slate-400 text-xs">
                Notes
              </th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {paginatedRecords.map((record) => (
              <tr
                key={record.id}
                className="transition-colors hover:bg-slate-800/20"
              >
                {/* Employee */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full ${getAvatarColor(record.id)} flex items-center justify-center text-xs font-semibold text-white`}
                    >
                      {getInitials(record.firstName, record.lastName)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-50">
                        {record.firstName} {record.lastName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {record.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Role / Department */}
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-100 capitalize">
                      {record.role}
                    </p>
                    <p className="text-xs text-slate-400">
                      {record.department || "N/A"}
                    </p>
                  </div>
                </td>

                {/* Check-In */}
                <td className="px-4 py-3 text-slate-100">
                  {record.checkIn ? (
                    <div>
                      <p className="font-medium">
                        {format(new Date(record.checkIn), "HH:mm")} <span className="text-xs text-slate-400">AM</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500">—</p>
                  )}
                </td>

                {/* Check-Out */}
                <td className="px-4 py-3 text-slate-100">
                  {record.checkOut ? (
                    <div>
                      <p className="font-medium">
                        {format(new Date(record.checkOut), "HH:mm")} <span className="text-xs text-slate-400">PM</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500">—</p>
                  )}
                </td>

                {/* Working Hours */}
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-50">
                      {record.workingHours}h
                    </p>
                    <p className="text-xs text-slate-400">
                      {record.breakDuration}h break
                    </p>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge status={record.status} />
                </td>

                {/* Notes */}
                <td className="px-4 py-3 max-w-xs">
                  {record.notes ? (
                    <p className="text-sm text-slate-400 truncate">
                      {record.notes}
                    </p>
                  ) : (
                    <p className="text-slate-600">—</p>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <button className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4">
        <p className="text-xs text-slate-400">
          Showing {startIdx + 1} to {Math.min(endIdx, records.length)} of{" "}
          {records.length} entries
        </p>

        {totalPages > 1 && (
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="rounded border border-slate-700 bg-slate-900/50 px-2 py-1 text-xs text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i + 1}
                onClick={() => onPageChange?.(i + 1)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  currentPage === i + 1
                    ? "bg-accent text-slate-950"
                    : "border border-slate-700 bg-slate-900/50 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() =>
                onPageChange?.(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="rounded border border-slate-700 bg-slate-900/50 px-2 py-1 text-xs text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
