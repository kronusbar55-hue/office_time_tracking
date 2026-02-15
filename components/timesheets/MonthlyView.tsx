"use client";

import { format, getDaysInMonth, startOfMonth, addDays, parseISO, startOfWeek, isToday as isTodayFn } from "date-fns";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface MonthlyViewProps {
  date: string;
  onRefresh?: () => void;
}

interface DaySummary {
  date: string;
  trackedMinutes: number;
  breakMinutes: number;
  payrollMinutes: number;
  overtimeMinutes?: number;
  workedHours?: string;
  breakHours?: string;
  overtimeHours?: string;
  isRestDay: boolean;
  isLeave?: boolean;
  leaveType?: string;
}

function fmt(min: number) {
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export function MonthlyView({ date, onRefresh }: MonthlyViewProps) {
  const [daysData, setDaysData] = useState<Record<string, DaySummary>>({});
  const [monthlyTotals, setMonthlyTotals] = useState<any | null>(null);
  const [weeklyTotals, setWeeklyTotals] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const parsedDate = parseISO(date);

  const fetchMonthly = async () => {
    setLoading(true);
    try {
      const monthKey = format(parsedDate, "yyyy-MM");
      const res = await fetch(`/api/timesheets/monthly?month=${monthKey}`);
      if (!res.ok) throw new Error("Failed to load monthly data");
      const json = await res.json();
      setDaysData(json.days || {});
      setMonthlyTotals(json.monthlyTotals || null);
      setWeeklyTotals(json.weeklyTotals || null);
    } catch (err) {
      setDaysData({});
      setMonthlyTotals(null);
      setWeeklyTotals(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthly();
  }, [date]);

  if (loading) {
    return <div className="py-8 text-center text-slate-500">Loading monthly calendar...</div>;
  }

  const monthStart = startOfMonth(parsedDate);
  const daysInMonth = getDaysInMonth(parsedDate);
  const firstDayOfWeek = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthName = format(parsedDate, "MMMM yyyy");

  const weeks: Array<Array<{ date: Date; dayNum: number; isCurrentMonth: boolean }>> = [];
  let currentDate = firstDayOfWeek;
  while (weeks.length < 6) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: currentDate, dayNum: currentDate.getDate(), isCurrentMonth: currentDate.getMonth() === monthStart.getMonth() });
      currentDate = addDays(currentDate, 1);
    }
    weeks.push(week);
  }

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleDayClick = (dayKey: string) => {
    const d = parseISO(dayKey);
    if (d <= today) router.push(`/timesheets/${dayKey}/details`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{monthName}</h2>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {dayLabels.map((label) => (
                <th key={label} className="px-3 py-3 text-center font-medium text-slate-600 uppercase text-xs">{label}</th>
              ))}
              <th className="px-3 py-3 text-center font-medium text-slate-700 text-xs">Week Total</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, weekIdx) => (
              <tr key={weekIdx} className="border-b border-slate-100 last:border-0">
                {week.map((day, dayIdx) => {
                  const dayKey = format(day.date, "yyyy-MM-dd");
                  const dayData: DaySummary = daysData[dayKey] || { date: dayKey, trackedMinutes: 0, breakMinutes: 0, payrollMinutes: 0, isRestDay: true };
                  const isToday = isTodayFn(day.date);
                  const isEmpty = !day.isCurrentMonth;
                  const isFuture = parseISO(dayKey) > today;
                  const clickable = !isEmpty && !isFuture;

                  return (
                    <td
                      key={dayIdx}
                      onClick={() => clickable && handleDayClick(dayKey)}
                      className={`px-3 py-3 text-center border-r border-slate-100 last:border-0 min-w-[90px] ${
                        isEmpty ? "bg-slate-50/50" : ""
                      } ${isToday ? "bg-orange-50" : ""} ${clickable ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""}`}
                    >
                      {isEmpty ? (
                        <div className="text-xs text-slate-300">{day.dayNum}</div>
                      ) : (
                        <div className="space-y-1">
                          <div className={`text-sm font-semibold ${isToday ? "text-orange-600" : "text-slate-900"}`}>
                            {day.dayNum}
                          </div>
                          {dayData.isLeave ? (
                            <div className="text-xs font-medium text-blue-600">
                              {dayData.leaveType || "Leave"}
                            </div>
                          ) : dayData.isRestDay ? (
                            <div className="text-xs text-slate-400">—</div>
                          ) : (
                            <>
                              <div className={`text-xs font-medium ${isToday ? "text-orange-600" : "text-slate-700"}`}>
                                {dayData.trackedMinutes ? fmt(dayData.trackedMinutes) : "—"}
                              </div>
                              {dayData.breakMinutes > 0 && (
                                <div className="text-[10px] text-slate-500">
                                  {fmt(dayData.breakMinutes)} break
                                </div>
                              )}
                              {(dayData.overtimeMinutes || 0) > 0 && (
                                <div className="text-[10px] text-amber-600 font-medium">
                                  +{fmt(dayData.overtimeMinutes || 0)} OT
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-center font-semibold text-slate-900 bg-slate-50/80">
                  {(() => {
                    const weekTotal = week.reduce((sum, d) => {
                      const key = format(d.date, "yyyy-MM-dd");
                      const data = daysData[key];
                      return sum + (data?.trackedMinutes || 0);
                    }, 0);
                    return weekTotal > 0 ? <div className="text-sm">{fmt(weekTotal)}</div> : "—";
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="text-sm text-slate-500">
          Click a day to view detailed entries
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm text-slate-600">Monthly total</p>
          <p className="text-2xl font-bold text-slate-900">
            {monthlyTotals ? fmt(monthlyTotals.totalTrackedMinutes) : "—"}
          </p>
          {monthlyTotals?.totalOvertimeMinutes > 0 && (
            <p className="text-xs text-amber-600 font-medium">
              +{fmt(monthlyTotals.totalOvertimeMinutes)} overtime
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
