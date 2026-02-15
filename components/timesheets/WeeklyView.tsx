"use client";

import { format, startOfWeek, addDays, parseISO, isToday } from "date-fns";
import { useEffect, useState } from "react";

interface WeeklyViewProps {
  date: string;
}

interface DaySummary {
  date: string;
  dayName: string;
  dayNum: number;
  firstClockIn: string | null;
  lastClockOut: string | null;
  trackedMinutes: number;
  breakMinutes: number;
  payrollMinutes: number;
  overtimeMinutes?: number;
  isRestDay: boolean;
  isOngoing: boolean;
}

export function WeeklyView({ date }: WeeklyViewProps) {
  const [days, setDays] = useState<DaySummary[]>([]);
  const [weekRange, setWeekRange] = useState<{ start: string; end: string } | null>(null);
  const [weeklyTotals, setWeeklyTotals] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const parsedDate = parseISO(date);

  useEffect(() => {
    const fetchWeekly = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/timesheets/weekly?date=${date}`);
        if (!res.ok) throw new Error("Failed to load weekly data");
        const json = await res.json();
        setWeekRange({ start: json.weekStart, end: json.weekEnd });
        setDays(json.days || []);
        setWeeklyTotals(json.weeklyTotals || null);
      } catch (err) {
        setDays([]);
        setWeeklyTotals(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeekly();
  }, [date]);

  if (loading) {
    return <div className="py-8 text-center text-slate-500">Loading weekly timesheet...</div>;
  }

  const weekStart = startOfWeek(parsedDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const dateRange = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Weekly Timesheets</h2>
          <p className="text-sm text-slate-500 mt-1">{dateRange}</p>
        </div>
        <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          Duplicate timesheets
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-left font-medium text-slate-900">Metric</th>
              {days.map((d) => (
                <th key={d.date} className={`px-4 py-3 text-center font-medium ${isToday(parseISO(d.date)) ? "text-orange-600 bg-orange-50" : "text-slate-700"}`}>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{d.dayName}</div>
                  <div className="text-sm font-semibold">{d.dayNum}</div>
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium text-slate-900">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">First in</td>
              {days.map((d) => (
                <td key={`in-${d.date}`} className={`px-4 py-3 text-center text-slate-700 ${isToday(parseISO(d.date)) ? "bg-orange-50" : ""}`}>
                  {d.firstClockIn ? <div className="text-slate-900 font-medium">{format(parseISO(d.firstClockIn), "h:mm a")}</div> : "-"}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-slate-600">-</td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Last out</td>
              {days.map((d) => (
                <td key={`out-${d.date}`} className={`px-4 py-3 text-center text-slate-700 ${isToday(parseISO(d.date)) ? "bg-orange-50" : ""}`}>
                  {d.isOngoing ? <div className="text-sm font-medium text-orange-600">ongoing</div> : (d.lastClockOut ? format(parseISO(d.lastClockOut), "h:mm a") : "-")}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-slate-600">-</td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Tracked hours</td>
              {days.map((d) => (
                <td key={`tracked-${d.date}`} className={`px-4 py-3 text-center font-medium ${isToday(parseISO(d.date)) ? "bg-orange-50 text-orange-600" : "text-slate-900"}`}>
                  {d.trackedMinutes ? `${Math.floor(d.trackedMinutes / 60)}h ${d.trackedMinutes % 60}m` : "-"}
                </td>
              ))}
              <td className="px-4 py-3 text-right font-semibold text-slate-900">{weeklyTotals ? `${Math.floor(weeklyTotals.totalTrackedMinutes/60)}h ${weeklyTotals.totalTrackedMinutes%60}m` : "-"}</td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Break hours</td>
              {days.map((d) => (
                <td key={`break-${d.date}`} className={`px-4 py-3 text-center font-medium ${isToday(parseISO(d.date)) ? "bg-orange-50 text-orange-600" : "text-slate-900"}`}>
                  {d.breakMinutes ? `${Math.floor(d.breakMinutes / 60)}h ${d.breakMinutes % 60}m` : "-"}
                </td>
              ))}
              <td className="px-4 py-3 text-right font-semibold text-slate-900">{weeklyTotals ? `${Math.floor(weeklyTotals.totalBreakMinutes / 60)}h ${weeklyTotals.totalBreakMinutes % 60}m` : "-"}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Payroll hours</td>
              {days.map((d) => (
                <td key={`payroll-${d.date}`} className={`px-4 py-3 text-center font-medium ${isToday(parseISO(d.date)) ? "bg-orange-50 text-orange-600" : "text-slate-900"}`}>
                  {d.payrollMinutes ? `${Math.floor(d.payrollMinutes / 60)}h ${d.payrollMinutes % 60}m` : "-"}
                </td>
              ))}
              <td className="px-4 py-3 text-right font-semibold text-slate-900">{weeklyTotals ? `${Math.floor(weeklyTotals.totalPayrollMinutes / 60)}h ${weeklyTotals.totalPayrollMinutes % 60}m` : "-"}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-slate-900">Overtime</td>
              {days.map((d) => (
                <td key={`ot-${d.date}`} className={`px-4 py-3 text-center font-medium ${d.overtimeMinutes ? "text-amber-600" : "text-slate-500"}`}>
                  {d.overtimeMinutes ? `${Math.floor(d.overtimeMinutes / 60)}h ${d.overtimeMinutes % 60}m` : "-"}
                </td>
              ))}
              <td className="px-4 py-3 text-right font-semibold text-amber-600">{weeklyTotals?.totalOvertimeMinutes ? `${Math.floor(weeklyTotals.totalOvertimeMinutes / 60)}h ${weeklyTotals.totalOvertimeMinutes % 60}m` : "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-end gap-8">
        <div className="text-right">
          <p className="text-sm text-slate-600">Weekly total</p>
          <p className="text-2xl font-semibold text-slate-900">{weeklyTotals ? `${Math.floor(weeklyTotals.totalTrackedMinutes / 60)}h ${weeklyTotals.totalTrackedMinutes % 60}m` : "-"}</p>
        </div>
        {weeklyTotals?.totalOvertimeMinutes > 0 && (
          <div className="text-right">
            <p className="text-sm text-slate-600">Overtime total</p>
            <p className="text-2xl font-semibold text-amber-600">{`${Math.floor(weeklyTotals.totalOvertimeMinutes / 60)}h ${weeklyTotals.totalOvertimeMinutes % 60}m`}</p>
          </div>
        )}
      </div>
    </div>
  );
}
