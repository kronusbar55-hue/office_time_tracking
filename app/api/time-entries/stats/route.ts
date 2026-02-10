import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { TimeSession } from "@/models/TimeSession";
import { TimeSessionBreak } from "@/models/TimeSessionBreak";

export async function GET(request: Request) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "month"; // day, week, month

    let startDate = new Date();
    let dateRange: string[] = [];

    if (period === "day") {
      // Last 7 days
      startDate.setDate(startDate.getDate() - 6);
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dateRange.push(d.toISOString().split("T")[0]);
      }
    } else if (period === "week") {
      // Last 4 weeks (28 days)
      startDate.setDate(startDate.getDate() - 27);
      for (let i = 27; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dateRange.push(d.toISOString().split("T")[0]);
      }
    } else {
      // This month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        dateRange.push(d.toISOString().split("T")[0]);
      }
    }

    // Get time sessions for the date range
    const timeSessions = await TimeSession.find({
      user: payload.sub,
      clockIn: {
        $gte: new Date(startDate.toISOString().split("T")[0]),
        $lte: new Date(new Date().toISOString().split("T")[0])
      }
    }).lean();

    // Group by date and calculate hours
    const statsMap = new Map<string, { worked: number; breaks: number }>();

    dateRange.forEach((date) => {
      statsMap.set(date, { worked: 0, breaks: 0 });
    });

    timeSessions.forEach((session: any) => {
      const clockInDate = new Date(session.clockIn);
      const dateStr = clockInDate.toISOString().split("T")[0];
      const current = statsMap.get(dateStr) || { worked: 0, breaks: 0 };

      if (session.clockOut) {
        const duration =
          (new Date(session.clockOut).getTime() -
            new Date(session.clockIn).getTime()) /
          1000 /
          60;
        current.worked += duration;
      }

      statsMap.set(dateStr, current);
    });

    // Get breaks from TimeSessionBreak
    const breaks = await TimeSessionBreak.find({
      timeSession: { $in: timeSessions.map((s: any) => s._id) }
    }).lean();

    breaks.forEach((brk: any) => {
      if (brk.timeSession) {
        const session = timeSessions.find(
          (s: any) => s._id.toString() === brk.timeSession.toString()
        );
        if (session) {
          const clockInDate = new Date(session.clockIn);
          const dateStr = clockInDate.toISOString().split("T")[0];
          const current = statsMap.get(dateStr) || { worked: 0, breaks: 0 };

          if (brk.breakStart && brk.breakEnd) {
            const duration =
              (new Date(brk.breakEnd).getTime() -
                new Date(brk.breakStart).getTime()) /
              1000 /
              60;
            current.breaks += duration;
          }

          statsMap.set(dateStr, current);
        }
      }
    });

    const stats = dateRange.map((date) => {
      const data = statsMap.get(date) || { worked: 0, breaks: 0 };
      const workedMinutes = Math.round(data.worked);
      const breakMinutes = Math.round(data.breaks);
      const overtimeMinutes = Math.max(0, workedMinutes - 8 * 60); // 8 hours per day

      return {
        date,
        workedMinutes,
        breakMinutes,
        overtimeMinutes
      };
    });

    const totalWorkedMinutes = stats.reduce((sum, s) => sum + s.workedMinutes, 0);
    const totalBreakMinutes = stats.reduce((sum, s) => sum + s.breakMinutes, 0);
    const totalOvertimeMinutes = stats.reduce((sum, s) => sum + s.overtimeMinutes, 0);

    return NextResponse.json({
      stats,
      totalWorkedMinutes,
      totalBreakMinutes,
      totalOvertimeMinutes,
      period
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
