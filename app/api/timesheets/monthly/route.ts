import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TimeEntry } from "@/models/TimeEntry";
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

export interface MonthlySummary {
  [key: string]: {
    date: string;
    trackedMinutes: number;
    breakMinutes: number;
    payrollMinutes: number;
    isRestDay: boolean;
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
    const monthStr = searchParams.get("month"); // YYYY-MM format

    if (!monthStr) {
      return NextResponse.json(
        { error: "Month parameter required (YYYY-MM)" },
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

    const timeEntries = await TimeEntry.find({
      user: userId,
      clockIn: {
        $gte: monthStart,
        $lte: monthEnd
      }
    }).lean();

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
          totalPayrollMinutes: 0
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

      days[dayStr] = {
        date: dayStr,
        trackedMinutes: totalTrackedMinutes,
        breakMinutes: totalBreakMinutes,
        payrollMinutes,
        isRestDay: entries.length === 0
      };

      // Add to weekly total
      weeklyTotals[weekNum].totalTrackedMinutes += totalTrackedMinutes;
      weeklyTotals[weekNum].totalBreakMinutes += totalBreakMinutes;
      weeklyTotals[weekNum].totalPayrollMinutes += payrollMinutes;
    }

    // Calculate monthly totals
    const monthlyTotals = {
      totalTrackedMinutes: Object.values(days).reduce(
        (sum, d) => sum + d.trackedMinutes,
        0
      ),
      totalBreakMinutes: Object.values(days).reduce(
        (sum, d) => sum + d.breakMinutes,
        0
      ),
      totalPayrollMinutes: Object.values(days).reduce(
        (sum, d) => sum + d.payrollMinutes,
        0
      )
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
