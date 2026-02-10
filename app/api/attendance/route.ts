import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { TimeEntry } from "@/models/TimeEntry";
import { formatISO, parseISO, startOfDay, endOfDay } from "date-fns";

export interface AttendanceRecord {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  technology?: { id: string; name: string } | null;
  avatar?: string;
  checkIn?: Date;
  checkOut?: Date | null;
  breaks: Array<{
    startTime: Date;
    endTime?: Date | null;
    reason?: string;
  }>;
  workingHours: number;
  breakDuration: number;
  status: "checked-in" | "checked-out" | "on-break" | "not-checked-in";
  notes?: string;
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString();
    const technology = searchParams.get("technology");
    const search = searchParams.get("search")?.toLowerCase() || "";
    const status = searchParams.get("status");

    const selectedDate = parseISO(date);
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    // Get all active users
    let userQuery = User.find({ isDeleted: false, isActive: true }).populate({ path: "technology", select: "name" });

    if (technology && technology !== "all") {
      userQuery = userQuery.where("technology").equals(technology);
    }

    const users = await userQuery.lean();

    // Get time entries for the selected date
    const timeEntries = await TimeEntry.find({
      user: { $in: users.map((u) => u._id) },
      clockIn: {
        $gte: dayStart,
        $lte: dayEnd
      }
    }).lean();

    // Build attendance records
    const attendanceRecords: AttendanceRecord[] = users
      .map((user) => {
        const entry = timeEntries.find(
          (t) => t.user.toString() === user._id.toString()
        );

        let attendanceStatus: AttendanceRecord["status"] = "not-checked-in";
        let workingHours = 0;
        let breakDuration = 0;

        if (entry) {
          const clockOut = entry.clockOut;

          // Base duration from clock-in until clock-out (or now if still working)
          const durationMs = (clockOut ?? new Date()).getTime() - entry.clockIn.getTime();

          // Calculate break duration from breaks array.
          // For ongoing breaks (no endTime yet), count time up to now.
          let totalBreakMs = 0;
          let hasActiveBreak = false;

          if (entry.breaks && entry.breaks.length > 0) {
            entry.breaks.forEach((breakItem) => {
              if (!breakItem.endTime) {
                hasActiveBreak = true;
              }

              const effectiveEnd =
                breakItem.endTime ?? (clockOut ?? new Date());

              if (effectiveEnd > breakItem.startTime) {
                totalBreakMs += effectiveEnd.getTime() - breakItem.startTime.getTime();
              }
            });
          }

          breakDuration = totalBreakMs / (1000 * 60 * 60);
          workingHours = durationMs / (1000 * 60 * 60) - breakDuration;

          // Derive status based on clock-out and active break state
          if (hasActiveBreak && !clockOut) {
            attendanceStatus = "on-break";
          } else if (!clockOut) {
            attendanceStatus = "checked-in";
          } else {
            attendanceStatus = "checked-out";
          }
        }

        return {
          id: user._id.toString(),
          userId: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          technology: user.technology ? { id: String((user as any).technology._id || (user as any).technology), name: (user as any).technology.name } : null,
          avatar: user.avatarUrl,
          checkIn: entry?.clockIn,
          checkOut: entry?.clockOut || null,
          breaks: entry?.breaks || [],
          workingHours: Math.round(workingHours * 100) / 100,
          breakDuration: Math.round(breakDuration * 100) / 100,
          status: attendanceStatus,
          notes: entry?.notes
        };
      })
      .filter((record) => {
        // Apply search filter
        if (
          search &&
          !record.firstName.toLowerCase().includes(search) &&
          !record.lastName.toLowerCase().includes(search) &&
          !record.userId.toLowerCase().includes(search)
        ) {
          return false;
        }

        // Apply status filter
        if (status && status !== "all" && record.status !== status) {
          return false;
        }

        return true;
      })
      .sort((a, b) => `${a.firstName}${a.lastName}`.localeCompare(`${b.firstName}${b.lastName}`));

    // Calculate summary stats
    const summary = {
      totalEmployees: users.length,
      checkedIn: attendanceRecords.filter((r) => r.status === "checked-in")
        .length,
      checkedOut: attendanceRecords.filter((r) => r.status === "checked-out")
        .length,
      onBreak: attendanceRecords.filter((r) => r.status === "on-break").length,
      notCheckedIn: attendanceRecords.filter(
        (r) => r.status === "not-checked-in"
      ).length
    };

    return NextResponse.json({
      data: attendanceRecords,
      summary,
      date: formatISO(selectedDate)
    });
  } catch (error) {
    console.error("Attendance API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance data" },
      { status: 500 }
    );
  }
}
