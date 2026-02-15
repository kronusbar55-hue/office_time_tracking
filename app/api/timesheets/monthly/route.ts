import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TimeEntry } from "@/models/TimeEntry";
import { LeaveRequest } from "@/models/LeaveRequest";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import {
  startOfMonth,
  endOfMonth,
  parseISO,
  format,
  differenceInMinutes,
  getDaysInMonth,
  addDays
} from "date-fns";

const SHIFT_HOURS = 8;
const SHIFT_MINUTES = SHIFT_HOURS * 60;

function formatHoursMinutes(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

export interface MonthlySummary {
  [key: string]: {
    date: string;
    trackedMinutes: number;
    breakMinutes: number;
    payrollMinutes: number;
    overtimeMinutes: number;
    workedHours: string;
    breakHours: string;
    overtimeHours: string;
    isRestDay: boolean;
    isLeave: boolean;
    leaveType?: string;
  };
}

export interface MonthlyTimesheetData {
  month: string;
  year: number;
  days: MonthlySummary;
  monthlyTotals: {
    totalTrackedMinutes: number;
    totalBreakMinutes: number;
    totalPayrollMinutes: number;
    totalOvertimeMinutes: number;
  };
  weeklyTotals: {
    [weekNum: number]: {
      totalTrackedMinutes: number;
      totalBreakMinutes: number;
      totalPayrollMinutes: number;
    };
  };
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    let monthStr = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const monthNum = searchParams.get("month");

    if (!monthStr && monthNum && yearParam) {
      monthStr = `${yearParam}-${String(monthNum).padStart(2, "0")}`;
    }
    if (!monthStr) {
      return NextResponse.json(
        { error: "Month parameter required (YYYY-MM or month+year)" },
        { status: 400 }
      );
    }

    const selectedDate = parseISO(`${monthStr}-01`);
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    // Authenticate user from cookie
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.sub;

    const [timeEntries, approvedLeaves] = await Promise.all([
      TimeEntry.find({
        user: userId,
        clockIn: { $gte: monthStart, $lte: monthEnd }
      }).lean(),
      LeaveRequest.find({
        user: userId,
        status: "approved",
        startDate: { $lte: format(monthEnd, "yyyy-MM-dd") },
        endDate: { $gte: format(monthStart, "yyyy-MM-dd") }
      })
        .populate("leaveType", "name")
        .lean()
    ]);

    const leaveDates = new Set<string>();
    approvedLeaves.forEach((l: any) => {
      const start = parseISO(l.startDate);
      const end = parseISO(l.endDate);
      let d = start;
      while (d <= end) {
        leaveDates.add(format(d, "yyyy-MM-dd"));
        d = addDays(d, 1);
      }
    });

    // Group entries by day
    const dayMap: {
      [key: string]: Array<any>;
    } = {};

    const daysInMonth = getDaysInMonth(selectedDate);
    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        i
      );
      const dayStr = format(day, "yyyy-MM-dd");
      dayMap[dayStr] = [];
    }

    timeEntries.forEach((entry: any) => {
      const dayStr = format(new Date(entry.clockIn), "yyyy-MM-dd");
      if (dayMap[dayStr]) {
        dayMap[dayStr].push(entry);
      }
    });

    // Build day summaries
    const days: MonthlySummary = {};
    const weeklyTotals: {
      [weekNum: number]: {
        totalTrackedMinutes: number;
        totalBreakMinutes: number;
        totalPayrollMinutes: number;
      };
    } = {};

    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        i
      );
      const dayStr = format(day, "yyyy-MM-dd");
      const weekNum = Math.ceil(i / 7);

      if (!weeklyTotals[weekNum]) {
        weeklyTotals[weekNum] = {
          totalTrackedMinutes: 0,
          totalBreakMinutes: 0,
          totalPayrollMinutes: 0,
          totalOvertimeMinutes: 0
        };
      }

      const entries = dayMap[dayStr];

      let totalTrackedMinutes = 0;
      let totalBreakMinutes = 0;

      if (entries.length > 0) {
        entries.forEach((entry: any) => {
          const clockInTime = new Date(entry.clockIn);
          const clockOutTime = entry.clockOut
            ? new Date(entry.clockOut)
            : null;

          let trackedMinutes = 0;
          if (clockOutTime) {
            trackedMinutes = differenceInMinutes(clockOutTime, clockInTime);
          } else {
            trackedMinutes = differenceInMinutes(new Date(), clockInTime);
          }

          let breakMinutes = 0;
          (entry.breaks || []).forEach((breakItem: any) => {
            if (breakItem.endTime) {
              breakMinutes += differenceInMinutes(
                new Date(breakItem.endTime),
                new Date(breakItem.startTime)
              );
            }
          });

          totalTrackedMinutes += trackedMinutes;
          totalBreakMinutes += breakMinutes;
        });
      }

      const payrollMinutes = totalTrackedMinutes - totalBreakMinutes;
      const overtimeMinutes = Math.max(0, payrollMinutes - SHIFT_MINUTES);
      const isLeave = leaveDates.has(dayStr);
      const leaveRec = approvedLeaves.find((l: any) => {
        const start = parseISO(l.startDate);
        const end = parseISO(l.endDate);
        const day = parseISO(dayStr);
        return day >= start && day <= end;
      });

      days[dayStr] = {
        date: dayStr,
        trackedMinutes: totalTrackedMinutes,
        breakMinutes: totalBreakMinutes,
        payrollMinutes,
        overtimeMinutes,
        workedHours: formatHoursMinutes(totalTrackedMinutes),
        breakHours: formatHoursMinutes(totalBreakMinutes),
        overtimeHours: formatHoursMinutes(overtimeMinutes),
        isRestDay: entries.length === 0 && !isLeave,
        isLeave,
        leaveType: leaveRec ? (leaveRec.leaveType as any)?.name : undefined
      };

      weeklyTotals[weekNum].totalTrackedMinutes += totalTrackedMinutes;
      weeklyTotals[weekNum].totalBreakMinutes += totalBreakMinutes;
      weeklyTotals[weekNum].totalPayrollMinutes += payrollMinutes;
      weeklyTotals[weekNum].totalOvertimeMinutes += overtimeMinutes;
    }

    const monthlyTotals = {
      totalTrackedMinutes: Object.values(days).reduce((sum, d) => sum + d.trackedMinutes, 0),
      totalBreakMinutes: Object.values(days).reduce((sum, d) => sum + d.breakMinutes, 0),
      totalPayrollMinutes: Object.values(days).reduce((sum, d) => sum + d.payrollMinutes, 0),
      totalOvertimeMinutes: Object.values(days).reduce((sum, d) => sum + d.overtimeMinutes, 0)
    };

    return NextResponse.json({
      month: monthStr,
      year: selectedDate.getFullYear(),
      days,
      monthlyTotals,
      weeklyTotals
    } as MonthlyTimesheetData);
  } catch (error) {
    console.error("Monthly timesheet error:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly timesheet" },
      { status: 500 }
    );
  }
}
