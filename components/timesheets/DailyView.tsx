"use client";

import { Clock, LogOut, Coffee, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "react-toastify";
import type { DailyTimesheetData } from "@/app/api/timesheets/daily/route";

interface DailyViewProps {
  date: string;
  userName?: string;
  timezone?: string;
  workSchedule?: string;
}

function minutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}


export function DailyView({
  date,
  userName,
  timezone = "",
  workSchedule = ""
}: DailyViewProps) {
  const [currentUserName, setCurrentUserName] = useState<string | null>(userName || null);
  const [data, setData] = useState<DailyTimesheetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<{
    projectId: string;
    hours: number;
    notes?: string;
  }[]>([]);
  const [isSubmittingAllocation, setIsSubmittingAllocation] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/timesheets/daily?date=${date}`);
        if (!response.ok) {
          throw new Error("Failed to fetch timesheet data");
        }
        const dailyData: DailyTimesheetData = await response.json();
        setData(dailyData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [date]);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setCurrentUserName(`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim());
    } else {
      setCurrentUserName(userName || null);
    }
  }, [user, userName]);

  const handleClockIn = async () => {
    try {
      setIsClockingIn(true);
      const response = await fetch("/api/timesheets/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clock-in" })
      });

      if (!response.ok) {
        throw new Error("Failed to clock in");
      }

      toast.success("Clocked in successfully!");
      // Refetch data
      const dailyResponse = await fetch(`/api/timesheets/daily?date=${date}`);
      if (dailyResponse.ok) {
        const dailyData: DailyTimesheetData = await dailyResponse.json();
        setData(dailyData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to clock in";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsClockingIn(false);
    }
  };

  const refetch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/timesheets/daily?date=${date}`);
      if (response.ok) {
        const json: DailyTimesheetData = await response.json();
        setData(json);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartBreak = async () => {
    try {
      const res = await fetch("/api/timesheets/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start-break" })
      });
      if (!res.ok) throw new Error("Failed to start break");
      toast.success("Break started!");
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleEndBreak = async () => {
    try {
      const res = await fetch("/api/timesheets/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end-break" })
      });
      if (!res.ok) throw new Error("Failed to end break");
      toast.success("Break ended!");
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const openAllocationModal = async () => {
    // fetch projects for the user
    try {
      const res = await fetch(`/api/projects?forCurrentUser=true`);
      if (!res.ok) throw new Error("Failed to load projects");
      const list = await res.json();
      setProjects(list || []);
      // initialize allocations array
      setAllocations([]);
      setShowAllocationModal(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleAllocationChange = (index: number, field: string, value: any) => {
    setAllocations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addAllocationRow = () => {
    setAllocations((prev) => [...prev, { projectId: projects[0]?._id || "", hours: 0, notes: "" }]);
  };

  const submitAllocations = async () => {
    if (!data) return;
    const trackedHours = (data.summary.totalPayrollMinutes || 0) / 60;
    const total = allocations.reduce((s, a) => s + Number(a.hours || 0), 0);
    // allow small rounding
    if (Math.abs(total - trackedHours) > 0.1) {
      const msg = `Project hours (${total.toFixed(2)}h) must equal tracked hours (${trackedHours.toFixed(2)}h)`;
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsSubmittingAllocation(true);
    try {
      const res = await fetch("/api/timesheets/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clock-out", projectAllocations: allocations.map(a => ({ project: a.projectId, hours: a.hours, notes: a.notes })) })
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error || "Failed to clock out");
      }
      toast.success("Clocked out successfully!");
      setShowAllocationModal(false);
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmittingAllocation(false);
    }
  };
  const parsedDate = parseISO(date);
  const displayDate = format(parsedDate, "EEEE, MMMM d, yyyy");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading timesheet data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  const summary = data?.summary || {
    firstClockIn: null,
    lastClockOut: null,
    totalTrackedMinutes: 0,
    totalBreakMinutes: 0,
    totalPayrollMinutes: 0,
    isOngoing: false
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Sidebar */}
      <div className="lg:col-span-1 space-y-6">
        {/* User Info */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-300 text-slate-700 font-semibold">
              M
            </div>
            <div>
              <p className="font-medium text-slate-900">{currentUserName || userName || "-"}</p>
              <p className="text-xs text-slate-500">Clocked from {timezone || 'Local'}</p>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Timesheet Timezone
              </p>
              <p className="text-sm font-medium text-slate-900">{timezone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Split Time
              </p>
              <p className="text-sm font-medium text-slate-900">12:00 am</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Work schedule
              </p>
              <p className="text-sm font-medium text-slate-900">{workSchedule}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="space-y-3">
          <SummaryCard
            label="Tracked Hours"
            value={minutesToHours(summary.totalTrackedMinutes)}
          />
          <SummaryCard
            label="Worked Hours"
            value={minutesToHours(summary.totalPayrollMinutes)}
          />
          <SummaryCard
            label="Breaks"
            value={minutesToHours(summary.totalBreakMinutes)}
          />
          <SummaryCard
            label="Payroll Hours"
            value={minutesToHours(summary.totalPayrollMinutes)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Date Header */}
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">{displayDate}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {summary.firstClockIn ? (
              <>
                First in: {format(parseISO(summary.firstClockIn), "h:mm a")} |
                Last out:{" "}
                {summary.lastClockOut
                  ? format(parseISO(summary.lastClockOut), "h:mm a")
                  : "Ongoing"}
              </>
            ) : (
              "No clock-ins recorded"
            )}
          </p>
        </div>

        {/* Time Entries */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900">Time Entries</h3>
            {!summary.isOngoing ? (
              <button
                onClick={handleClockIn}
                disabled={isClockingIn}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {isClockingIn ? "Clocking in..." : "Clock In"}
              </button>
            ) : (
              <div className="flex gap-3">
                {/* Break controls */}
                {data && data.entries.some(e => e.breaks.some(b => !b.endTime)) ? (
                  <button
                    onClick={handleEndBreak}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    End Break
                  </button>
                ) : (
                  <button
                    onClick={handleStartBreak}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Start Break
                  </button>
                )}

                {/* Clock out -> open allocation modal */}
                <button
                  onClick={openAllocationModal}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
                >
                  Clock Out
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Detailed list of clocked work hours and breaks
          </p>

          {data && data.entries.length > 0 ? (
            <div className="space-y-3">
              {data.entries.map((entry) => (
                <div key={entry._id}>
                  <TimeEntryRow
                    clockIn={parseISO(entry.clockIn)}
                    clockOut={entry.clockOut ? parseISO(entry.clockOut) : null}
                  />
                  {entry.breaks.map((breakItem, idx) => (
                    <BreakRow
                      key={`break-${idx}`}
                      startTime={parseISO(breakItem.startTime)}
                      endTime={
                        breakItem.endTime ? parseISO(breakItem.endTime) : null
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No entries for this day</p>
          )}
        </div>

        {/* Tracked Hours Breakdown */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Tracked Hours</h3>
            <button className="text-slate-400 hover:text-slate-600">▼</button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Include worked hours, break hours and any auto deductions.
          </p>
          <div className="flex justify-between items-center py-3 border-t border-slate-100">
            <p className="text-slate-700">Worked hours</p>
            <p className="font-semibold text-slate-900">
              {minutesToHours(summary.totalPayrollMinutes)}
            </p>
          </div>
        </div>

        {/* Payroll Hours */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Payroll Hours</h3>
            <button className="text-slate-400 hover:text-slate-600">▼</button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Include regular hours, paid breaks, overtime hours and paid time off.
          </p>
          <div className="space-y-3 border-t border-slate-100 pt-3">
            <div className="flex justify-between items-center py-3">
              <p className="text-slate-700">Regular</p>
              <p className="font-semibold text-slate-900">
                {minutesToHours(summary.totalPayrollMinutes)}
              </p>
            </div>
          </div>
        </div>

        {/* Change History */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Change History</h3>
            <span className="bg-slate-200 text-slate-700 text-xs font-medium px-2 py-1 rounded">
              0
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            View a history log of time entries that are manually added or changed.
          </p>
        </div>
      </div>
      {/* Project Allocation Modal */}
      {showAllocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Allocate Projects for Clock Out</h3>
              <button className="text-slate-500" onClick={() => setShowAllocationModal(false)}>✕</button>
            </div>

            <p className="text-sm text-slate-600 mb-4">Total worked hours: {(data?.summary.totalPayrollMinutes || 0) / 60}h</p>

            <div className="space-y-3">
              {allocations.map((a, idx) => (
                <div key={idx} className="flex gap-2">
                  <select
                    value={a.projectId}
                    onChange={(e) => handleAllocationChange(idx, "projectId", e.target.value)}
                    className="flex-1 rounded border px-2 py-1"
                  >
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.25"
                    value={a.hours}
                    onChange={(e) => handleAllocationChange(idx, "hours", Number(e.target.value))}
                    className="w-28 rounded border px-2 py-1"
                    placeholder="Hours"
                  />
                  <input
                    value={a.notes}
                    onChange={(e) => handleAllocationChange(idx, "notes", e.target.value)}
                    className="flex-1 rounded border px-2 py-1"
                    placeholder="Notes (optional)"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button onClick={addAllocationRow} className="rounded border px-3 py-2 text-sm">Add allocation</button>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setShowAllocationModal(false)} className="rounded border px-3 py-2 text-sm">Cancel</button>
                <button onClick={submitAllocations} disabled={isSubmittingAllocation} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white">{isSubmittingAllocation ? 'Submitting...' : 'Submit & Clock Out'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

interface TimeEntryRowProps {
  clockIn: Date;
  clockOut: Date | null;
}

function TimeEntryRow({ clockIn, clockOut }: TimeEntryRowProps) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
      <Clock className="h-5 w-5 text-green-500 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">Clock in</p>
      </div>
      <p className="text-sm text-slate-600">{format(clockIn, "h:mm a")}</p>
    </div>
  );
}

interface BreakRowProps {
  startTime: Date;
  endTime: Date | null;
}

function BreakRow({ startTime, endTime }: BreakRowProps) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0 ml-9">
      <Coffee className="h-5 w-5 text-yellow-500 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">Break</p>
      </div>
      <p className="text-sm text-slate-600">
        {format(startTime, "h:mm a")} -
        {endTime ? format(endTime, "h:mm a") : "ongoing"}
      </p>
    </div>
  );
}
