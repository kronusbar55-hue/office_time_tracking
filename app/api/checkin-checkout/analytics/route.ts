import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { CheckInOut } from "@/models/CheckInOut";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * GET /api/checkin-checkout/analytics
 * Get comprehensive analytics for check-in/check-out data
 */
export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // week, month, quarter, year
    const role = searchParams.get("role");
    const userId = searchParams.get("userId");

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === "quarter") {
      startDate.setMonth(now.getMonth() - 3);
    } else if (period === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const dateStart = startDate.toISOString().split("T")[0];
    const dateEnd = now.toISOString().split("T")[0];

    // Build query
    let query: any = {
      date: {
        $gte: dateStart,
        $lte: dateEnd
      }
    };

    const currentUser = await User.findById(payload.sub).lean();

    if (currentUser?.role === "employee" || userId) {
      query.user = userId || payload.sub;
    } else if (role) {
      query.userRole = role;
    }

    // Get records
    const records = await CheckInOut.find(query).lean();

    // Daily breakdown
    const dailyStats = new Map<string, { worked: number; count: number; overtime: number }>();

    records.forEach((record: any) => {
      if (!dailyStats.has(record.date)) {
        dailyStats.set(record.date, { worked: 0, count: 0, overtime: 0 });
      }
      const daily = dailyStats.get(record.date)!;
      daily.worked += (record.workMinutes || 0) / 60;
      daily.count += 1;
      if (record.isOvertime) {
        daily.overtime += (record.overtimeMinutes || 0) / 60;
      }
    });

    // Role breakdown
    const roleBreakdown = new Map<string, { count: number; hours: number; overtime: number }>();

    records.forEach((record: any) => {
      const roleKey = record.userRole || "unknown";
      if (!roleBreakdown.has(roleKey)) {
        roleBreakdown.set(roleKey, { count: 0, hours: 0, overtime: 0 });
      }
      const role = roleBreakdown.get(roleKey)!;
      role.count += 1;
      role.hours += (record.workMinutes || 0) / 60;
      if (record.isOvertime) {
        role.overtime += (record.overtimeMinutes || 0) / 60;
      }
    });

    // Issue breakdown
    const issues = {
      late: records.filter((r: any) => r.isLateCheckIn).length,
      earlyOut: records.filter((r: any) => r.isEarlyCheckOut).length,
      overtime: records.filter((r: any) => r.isOvertime).length
    };

    // Attendance rate
    const attendanceRates = new Map<string, number>();
    const EXPECTED_HOURS_PER_DAY = 8;
    const DAYS_IN_PERIOD = Math.ceil(
      (new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / (1000 * 60 * 60 * 24)
    );

    records.forEach((record: any) => {
      const userId = record.user.toString();
      if (!attendanceRates.has(userId)) {
        attendanceRates.set(userId, 0);
      }
      attendanceRates.set(userId, attendanceRates.get(userId)! + (record.workMinutes || 0));
    });

    const avgAttendance = Array.from(attendanceRates.values()).length > 0
      ? (Array.from(attendanceRates.values()).reduce((a, b) => a + b, 0) /
          (Array.from(attendanceRates.values()).length * DAYS_IN_PERIOD * 60)) *
        100
      : 0;

    // Summary
    const summary = {
      totalRecords: records.length,
      totalWorkHours: records.reduce((sum, r: any) => sum + ((r.workMinutes || 0) / 60), 0),
      totalBreakHours: records.reduce((sum, r: any) => sum + ((r.breakMinutes || 0) / 60), 0),
      totalOvertimeHours: records.reduce((sum, r: any) => sum + ((r.overtimeMinutes || 0) / 60), 0),
      averageWorkHoursPerDay: 0,
      averageAttendanceRate: Math.round(avgAttendance * 100) / 100,
      uniqueEmployees: new Set(records.map((r: any) => r.user.toString())).size
    };

    if (summary.totalRecords > 0) {
      summary.averageWorkHoursPerDay = Math.round((summary.totalWorkHours / summary.totalRecords) * 100) / 100;
    }

    return NextResponse.json(
      successResp("Analytics retrieved successfully", {
        summary,
        daily: Object.fromEntries(dailyStats),
        roleBreakdown: Object.fromEntries(roleBreakdown),
        issues,
        period,
        dateRange: { start: dateStart, end: dateEnd }
      })
    );
  } catch (err: any) {
    console.error("[checkin-checkout/analytics] error:", err);
    return NextResponse.json(
      errorResp("Failed to get analytics", err?.message),
      { status: 500 }
    );
  }
}
