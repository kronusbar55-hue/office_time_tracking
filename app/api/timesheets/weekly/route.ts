import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TimeEntry } from "@/models/TimeEntry";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import {
  startOfWeek,
  endOfWeek,
  parseISO,
  format,
  differenceInMinutes,
  addDays
} from "date-fns";

const SHIFT_MINUTES = 8 * 60;

export interface WeeklyTimesheetData {
  weekStart: string;
  weekEnd: string;
  days: Array<{
    date: string;
    dayName: string;
    dayNum: number;
    firstClockIn: string | null;
    lastClockOut: string | null;
    trackedMinutes: number;
    breakMinutes: number;
    payrollMinutes: number;
    overtimeMinutes: number;
    isRestDay: boolean;
    isOngoing: boolean;
  }>;
  weeklyTotals: {
    totalTrackedMinutes: number;
    totalBreakMinutes: number;
    totalPayrollMinutes: number;
    totalOvertimeMinutes: number;
  };
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date") || searchParams.get("startDate");

    if (!dateStr) {
      return NextResponse.json(
        { error: "Date parameter required (date or startDate)" },
        { status: 400 }
      );
    }

    const selectedDate = parseISO(dateStr);
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

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
        $gte: weekStart,
        $lte: weekEnd
      }
    }).lean();

    // Group entries by day
    const dayMap: {
      [key: string]: Array<any>;
    } = {};

    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
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
    const days = Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(weekStart, i);
      const dayStr = format(day, "yyyy-MM-dd");
      const entries = dayMap[dayStr];

      let firstClockIn: string | null = null;
      let lastClockOut: string | null = null;
      let totalTrackedMinutes = 0;
      let totalBreakMinutes = 0;
      let isOngoing = false;

      if (entries.length > 0) {
        entries.forEach((entry: any) => {
          const clockInTime = new Date(entry.clockIn);
          const clockOutTime = entry.clockOut
            ? new Date(entry.clockOut)
            : null;

          if (!firstClockIn) {
            firstClockIn = clockInTime.toISOString();
          }

          if (clockOutTime) {
            lastClockOut = clockOutTime.toISOString();
          } else {
            isOngoing = true;
          }

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
      return {
        date: dayStr,
        dayName: format(day, "EEE"),
        dayNum: parseInt(format(day, "d")),
        firstClockIn,
        lastClockOut,
        trackedMinutes: totalTrackedMinutes,
        breakMinutes: totalBreakMinutes,
        payrollMinutes,
        overtimeMinutes,
        isRestDay: entries.length === 0,
        isOngoing
      };
    });

    // Calculate weekly totals
    const weeklyTotals = {
      totalTrackedMinutes: days.reduce((sum, d) => sum + d.trackedMinutes, 0),
      totalBreakMinutes: days.reduce((sum, d) => sum + d.breakMinutes, 0),
      totalPayrollMinutes: days.reduce((sum, d) => sum + d.payrollMinutes, 0),
      totalOvertimeMinutes: days.reduce((sum, d) => sum + d.overtimeMinutes, 0)
    };

    return NextResponse.json({
      weekStart: format(weekStart, "yyyy-MM-dd"),
      weekEnd: format(weekEnd, "yyyy-MM-dd"),
      days,
      weeklyTotals
    } as WeeklyTimesheetData);
  } catch (error) {
    console.error("Weekly timesheet error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly timesheet" },
      { status: 500 }
    );
  }
}
