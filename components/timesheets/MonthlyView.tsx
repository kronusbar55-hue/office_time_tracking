"use client";

import { format, getDaysInMonth, startOfMonth, addDays, parseISO, startOfWeek, isToday as isTodayFn } from "date-fns";
import { useEffect, useState } from "react";

interface MonthlyViewProps {
  date: string;
}

interface DaySummary {
  date: string;
  trackedMinutes: number;
  breakMinutes: number;
  payrollMinutes: number;
  isRestDay: boolean;
}

export function MonthlyView({ date }: MonthlyViewProps) {
  const [daysData, setDaysData] = useState<Record<string, DaySummary>>({});
  const [monthlyTotals, setMonthlyTotals] = useState<any | null>(null);
  const [weeklyTotals, setWeeklyTotals] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const parsedDate = parseISO(date);

  useEffect(() => {
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

    fetchMonthly();
  }, [parsedDate]);

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

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{monthName}</h2>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {dayLabels.map((label) => (
                <th key={label} className="px-4 py-3 text-center font-medium text-slate-700 uppercase text-xs">{label}</th>
              ))}
              <th className="px-4 py-3 text-center font-medium text-slate-900 text-xs">Total</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, weekIdx) => (
              <tr key={weekIdx} className="border-b border-slate-200 last:border-0">
                {week.map((day, dayIdx) => {
                  const dayKey = format(day.date, "yyyy-MM-dd");
                  const dayData: DaySummary = daysData[dayKey] || { date: dayKey, trackedMinutes: 0, breakMinutes: 0, payrollMinutes: 0, isRestDay: true };
                  const isToday = isTodayFn(day.date);
                  const isEmpty = !day.isCurrentMonth;

                  return (
                    <td key={dayIdx} className={`px-4 py-4 text-center border-r border-slate-100 last:border-0 ${isEmpty ? "bg-slate-50" : ""} ${isToday ? "bg-orange-50" : ""}`}>
                      {isEmpty ? (
                        <div className="text-xs text-slate-400">{day.dayNum}</div>
                      ) : (
                        <div className="space-y-1">
                          <div className={`text-sm font-semibold ${isToday ? "text-orange-600" : "text-slate-900"}`}>{day.dayNum}</div>
                          <div className={`text-xs font-medium ${dayData.isRestDay ? "text-slate-400" : isToday ? "text-orange-600" : "text-slate-700"}`}>
                            {dayData.trackedMinutes ? `${Math.floor(dayData.trackedMinutes/60)}h ${dayData.trackedMinutes%60}m` : "-"}
                          </div>
                          {dayData.isRestDay && <div className="text-xs font-medium text-slate-400">Rest day</div>}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-4 text-center font-semibold text-slate-900 bg-slate-50">
                  <div className="text-sm">{weeklyTotals && weeklyTotals[weekIdx+1] ? `${Math.floor(weeklyTotals[weekIdx+1].totalTrackedMinutes/60)}h ${weeklyTotals[weekIdx+1].totalTrackedMinutes%60}m` : "-"}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="text-right space-y-1">
          <p className="text-sm text-slate-600">Monthly total</p>
          <p className="text-3xl font-semibold text-slate-900">{monthlyTotals ? `${Math.floor(monthlyTotals.totalTrackedMinutes/60)}h ${monthlyTotals.totalTrackedMinutes%60}m` : "-"}</p>
        </div>
      </div>
    </div>
  );
}
