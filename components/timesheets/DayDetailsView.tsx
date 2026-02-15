"use client";

import { Clock, LogOut, Coffee, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, addDays, differenceInMinutes } from "date-fns";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useTimeTracking } from "@/components/time-tracking/TimeTrackingProvider";
import type { DailyTimesheetData } from "@/app/api/timesheets/daily/route";

interface DayDetailsViewProps {
  date: string; 
}

function minutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function DayDetailsView({ date }: DayDetailsViewProps) {
  const [data, setData] = useState<DailyTimesheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { refresh: refreshTimeTracking } = useTimeTracking();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timesheets/daily?date=${date}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: DailyTimesheetData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  useEffect(() => {
    void refreshTimeTracking();
  }, [date]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-500">Loading day details...</p>
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

  const parsedDate = parseISO(date);
  const displayDate = format(parsedDate, "EEEE, MMMM d, yyyy");

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Summary Panel */}
      <div className="lg:col-span-1 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Summary</h3>
          <div className="space-y-4">
            <SummaryRow label="Tracked hours" value={minutesToHours(summary.totalTrackedMinutes)} />
            <SummaryRow label="Worked hours" value={minutesToHours(summary.totalPayrollMinutes)} />
            <SummaryRow label="Break hours" value={minutesToHours(summary.totalBreakMinutes)} />
            <SummaryRow label="Payroll hours" value={minutesToHours(summary.totalPayrollMinutes)} />
            <SummaryRow label="Regular hours" value={minutesToHours(summary.totalPayrollMinutes)} />
            <SummaryRow label="Time off" value="0h 0m" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Change History</h3>
          <p className="text-xs text-slate-500 mb-3">
            Manual edits and adjustments to time entries
          </p>
          {data?.changeHistory && data.changeHistory.length > 0 ? (
            <div className="space-y-2">
              {data.changeHistory.map((h, i) => (
                <div key={i} className="text-xs text-slate-600 border-l-2 border-slate-200 pl-2">
                  <span className="font-medium">{h.type}</span>: {h.details}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No changes recorded</p>
          )}
        </div>
      </div>

      {/* Main Content - Day Entries */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">{displayDate}</h2>
          <div className="flex items-center gap-2">
            <NavButton date={date} delta={-1} onSelect={(d) => router.push(`/timesheets/${d}/details`)} />
            <NavButton date={date} delta={1} onSelect={(d) => router.push(`/timesheets/${d}/details`)} />
          </div>
        </div>

        <p className="text-sm text-slate-500">
          {summary.firstClockIn ? (
            <>
              First in: {format(parseISO(summary.firstClockIn), "h:mm a")} · Last out:{" "}
              {summary.lastClockOut
                ? format(parseISO(summary.lastClockOut), "h:mm a")
                : "Ongoing"}
            </>
          ) : (
            "No clock-ins recorded"
          )}
        </p>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Time Entries</h3>

          {data && data.entries.length > 0 ? (
            <div className="space-y-6">
              {data.entries.map((entry, idx) => (
                <DayEntryBlock key={entry._id} entry={entry} index={idx + 1} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center rounded-lg bg-slate-50">
              <p className="text-slate-500">No time entries for this day</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function NavButton({
  date,
  delta,
  onSelect
}: {
  date: string;
  delta: number;
  onSelect: (d: string) => void;
}) {
  const d = addDays(parseISO(date), delta);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const disabled = delta > 0 && d > today;

  return (
    <button
      onClick={() => !disabled && onSelect(format(d, "yyyy-MM-dd"))}
      disabled={disabled}
      className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {delta < 0 ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  );
}

function DayEntryBlock({
  entry,
  index
}: {
  entry: DailyTimesheetData["entries"][0];
  index: number;
}) {
  const clockIn = parseISO(entry.clockIn);
  const clockOut = entry.clockOut ? parseISO(entry.clockOut) : null;
  const sessionMinutes = clockOut
    ? differenceInMinutes(clockOut, clockIn)
    : differenceInMinutes(new Date(), clockIn);
  let totalBreakMinutes = 0;
  entry.breaks.forEach((b) => {
    if (b.endTime) {
      totalBreakMinutes += differenceInMinutes(parseISO(b.endTime), parseISO(b.startTime));
    }
  });
  const workedMinutes = sessionMinutes - totalBreakMinutes;

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase">Session {index}</span>
        <span className="text-sm font-medium text-slate-700">
          {minutesToHours(workedMinutes)} worked
        </span>
      </div>

      <div className="space-y-2">
        <EntryRow
          icon={<Clock className="h-4 w-4 text-green-600" />}
          label="Clock-In"
          value={format(clockIn, "h:mm a")}
        />
        {entry.breaks.map((brk, i) => (
          <div key={i} className="ml-6 space-y-1">
            <EntryRow
              icon={<Coffee className="h-4 w-4 text-amber-500" />}
              label="Break start"
              value={format(parseISO(brk.startTime), "h:mm a")}
            />
            <EntryRow
              icon={<Coffee className="h-4 w-4 text-amber-500" />}
              label="Break end"
              value={brk.endTime ? format(parseISO(brk.endTime), "h:mm a") : "Ongoing"}
            />
          </div>
        ))}
        <EntryRow
          icon={<LogOut className="h-4 w-4 text-slate-600" />}
          label="Clock-Out"
          value={clockOut ? format(clockOut, "h:mm a") : "Ongoing"}
        />
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
        Session duration: {minutesToHours(sessionMinutes)} · Breaks: {minutesToHours(totalBreakMinutes)}
      </div>
    </div>
  );
}

function EntryRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-sm text-slate-600 w-24">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
