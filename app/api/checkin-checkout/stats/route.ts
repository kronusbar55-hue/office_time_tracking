import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { CheckInOut } from "@/models/CheckInOut";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * GET /api/checkin-checkout/stats
 * Get check-in/check-out statistics for dashboard
 * Supports filtering by period (today, week, month) and role
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
    const period = searchParams.get("period") || "month"; // today, week, month
    const role = searchParams.get("role");

    // Calculate date range
    let startDate = new Date();
    let endDate = new Date();

    if (period === "today") {
      // Today only
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "week") {
      // Last 7 days
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // This month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    const dateStart = startDate.toISOString().split("T")[0];
    const dateEnd = endDate.toISOString().split("T")[0];

    // Build query
    let query: any = {
      date: {
        $gte: dateStart,
        $lte: dateEnd
      }
    };

    // Role-based filtering
    const currentUser = await User.findById(payload.sub).lean();
    if (currentUser?.role === "employee") {
      query.user = payload.sub;
    } else if (role) {
      query.userRole = role;
    }

    // Get all check-in/check-out records
    const records = await CheckInOut.find(query)
      .populate("user", "firstName lastName email role")
      .lean();

    // Calculate statistics
    const stats = {
      totalRecords: records.length,
      checkedIn: records.filter((r: any) => r.clockIn && !r.clockOut).length,
      checkedOut: records.filter((r: any) => r.clockOut).length,
      totalWorkHours: 0,
      totalBreakHours: 0,
      averageWorkHours: 0,
      overtimeCount: records.filter((r: any) => r.isOvertime).length,
      lateCheckInCount: records.filter((r: any) => r.isLateCheckIn).length,
      earlyCheckOutCount: records.filter((r: any) => r.isEarlyCheckOut).length,
      averageAttendance: 0
    };

    // Calculate totals
    records.forEach((record: any) => {
      stats.totalWorkHours += (record.workMinutes || 0) / 60;
      stats.totalBreakHours += (record.breakMinutes || 0) / 60;
    });

    if (records.length > 0) {
      stats.averageWorkHours = Math.round((stats.totalWorkHours / records.length) * 100) / 100;
      stats.averageAttendance = Math.round(
        (records.reduce((sum: number, r: any) => sum + (r.attendancePercentage || 0), 0) / records.length) * 100
      ) / 100;
    }

    // Group by role
    const byRole = new Map<string, { count: number; totalHours: number }>();
    records.forEach((record: any) => {
      const role = record.userRole;
      if (!byRole.has(role)) {
        byRole.set(role, { count: 0, totalHours: 0 });
      }
      const current = byRole.get(role)!;
      current.count += 1;
      current.totalHours += (record.workMinutes || 0) / 60;
    });

    const roleStats = Object.fromEntries(byRole);

    return NextResponse.json(
      successResp("Statistics retrieved successfully", {
        stats,
        roleStats,
        records: records.slice(0, 50) // Return first 50 records
      })
    );
  } catch (err: any) {
    console.error("[checkin-checkout/stats] error:", err);
    return NextResponse.json(
      errorResp("Failed to get statistics", err?.message),
      { status: 500 }
    );
  }
}
