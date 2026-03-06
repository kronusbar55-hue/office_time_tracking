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

    // Get time stats from EmployeeMonitor for the date range
    const { getMonitorStats } = await import("@/lib/monitorUtils");
    const monitorStats = await getMonitorStats(payload.sub, startDate, new Date());

    const stats = dateRange.map((date) => {
      const dayData = monitorStats.find(s => s.date === date) || { workedMinutes: 0, breakMinutes: 0 };
      const workedMinutes = dayData.workedMinutes;
      const breakMinutes = dayData.breakMinutes;
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
