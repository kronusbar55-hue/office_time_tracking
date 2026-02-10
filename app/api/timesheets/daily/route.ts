import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TimeEntry } from "@/models/TimeEntry";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { startOfDay, endOfDay, parseISO, differenceInMinutes } from "date-fns";
import type { ITimeEntry } from "@/models/TimeEntry";

export interface DailyTimesheetData {
  date: string;
  entries: Array<{
    _id: string;
    clockIn: string;
    clockOut: string | null;
    breaks: Array<{
      startTime: string;
      endTime: string | null;
      reason?: string;
    }>;
    trackedMinutes: number;
    projectAllocations: Array<{
      projectId: string;
      projectName?: string;
      hours: number;
      notes?: string;
    }>;
    notes?: string;
  }>;
  summary: {
    firstClockIn: string | null;
    lastClockOut: string | null;
    totalTrackedMinutes: number;
    totalBreakMinutes: number;
    totalPayrollMinutes: number;
    isOngoing: boolean;
  };
  changeHistory: Array<{
    timestamp: string;
    type: string;
    details: string;
  }>;
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json(
        { error: "Date parameter required" },
        { status: 400 }
      );
    }

    // Validate date is not in the future
    const selectedDate = parseISO(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      return NextResponse.json(
        { error: "Cannot view future dates" },
        { status: 400 }
      );
    }

    // Authenticate user from cookie
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.sub;

    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    const timeEntries = await TimeEntry.find({
      user: userId,
      clockIn: {
        $gte: dayStart,
        $lte: dayEnd
      }
    })
      .populate("projectAllocations.project", "name")
      .lean();

    let firstClockIn: string | null = null;
    let lastClockOut: string | null = null;
    let totalTrackedMinutes = 0;
    let totalBreakMinutes = 0;
    let isOngoing = false;

    const entries = timeEntries.map((entry: any) => {
      const clockInTime = new Date(entry.clockIn);
      const clockOutTime = entry.clockOut ? new Date(entry.clockOut) : null;

      // Calculate tracked time
      let trackedMinutes = 0;
      if (clockOutTime) {
        trackedMinutes = differenceInMinutes(clockOutTime, clockInTime);
      } else {
        trackedMinutes = differenceInMinutes(new Date(), clockInTime);
        isOngoing = true;
      }

      // Calculate break time
      let breakMinutes = 0;
      const breaks = entry.breaks || [];
      breaks.forEach((breakItem: any) => {
        if (breakItem.endTime) {
          breakMinutes += differenceInMinutes(
            new Date(breakItem.endTime),
            new Date(breakItem.startTime)
          );
        }
      });

      // Update totals
      if (!firstClockIn) {
        firstClockIn = clockInTime.toISOString();
      }
      if (clockOutTime) {
        lastClockOut = clockOutTime.toISOString();
      }

      totalTrackedMinutes += trackedMinutes;
      totalBreakMinutes += breakMinutes;

      return {
        _id: entry._id.toString(),
        clockIn: clockInTime.toISOString(),
        clockOut: clockOutTime?.toISOString() || null,
        breaks: (entry.breaks || []).map((b: any) => ({
          startTime: new Date(b.startTime).toISOString(),
          endTime: b.endTime ? new Date(b.endTime).toISOString() : null,
          reason: b.reason
        })),
        trackedMinutes,
        projectAllocations: (entry.projectAllocations || []).map((pa: any) => ({
          projectId: pa.project?._id?.toString() || pa.project,
          projectName: pa.project?.name,
          hours: pa.hours,
          notes: pa.notes
        })),
        notes: entry.notes
      };
    });

    const summary = {
      firstClockIn,
      lastClockOut,
      totalTrackedMinutes,
      totalBreakMinutes,
      totalPayrollMinutes: totalTrackedMinutes - totalBreakMinutes,
      isOngoing
    };

    return NextResponse.json({
      date: dateStr,
      entries,
      summary,
      changeHistory: []
    } as DailyTimesheetData);
  } catch (error) {
    console.error("Daily timesheet error:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily timesheet" },
      { status: 500 }
    );
  }
}
