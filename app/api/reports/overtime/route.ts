import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";

const STANDARD_WORK_HOURS = 8 * 60; // 8 hours in minutes

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    // Only admin and HR can access overtime reports
    if (payload.role !== "admin" && payload.role !== "hr") {
      return NextResponse.json(
        errorResp("You don't have access to overtime reports"),
        { status: 403 }
      );
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");

    // Get date range (default: last 30 days)
    let start = startDate;
    let end = endDate;

    if (!start || !end) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      start = thirtyDaysAgo.toISOString().split("T")[0];
      end = today.toISOString().split("T")[0];
    }

    let query: any = { date: { $gte: start, $lte: end }, status: "completed" };
    if (userId) {
      query.user = userId;
    }

    // Get sessions
    const sessions = await TimeSession.find(query)
      .populate("user", "firstName lastName email")
      .sort({ date: -1 })
      .lean();

    // Calculate overtime by user
    const overtimeByUser = new Map();

    sessions.forEach((session: any) => {
      const userId = session.user?._id?.toString();
      const workMinutes = session.totalWorkMinutes || 0;
      const overtimeMinutes = Math.max(0, workMinutes - STANDARD_WORK_HOURS);

      if (!overtimeByUser.has(userId)) {
        overtimeByUser.set(userId, {
          userId,
          user: {
            id: session.user?._id?.toString(),
            firstName: session.user?.firstName,
            lastName: session.user?.lastName,
            email: session.user?.email
          },
          totalOvertimeMinutes: 0,
          sessions: [],
          daysWithOvertime: 0
        });
      }

      if (overtimeMinutes > 0) {
        const userData = overtimeByUser.get(userId);
        userData.totalOvertimeMinutes += overtimeMinutes;
        userData.daysWithOvertime += 1;
        userData.sessions.push({
          id: session._id.toString(),
          date: session.date,
          workMinutes,
          overtimeMinutes,
          clockIn: session.clockIn,
          clockOut: session.clockOut
        });
      }
    });

    // Convert map to array and sort by overtime
    const results = Array.from(overtimeByUser.values()).sort(
      (a: any, b: any) => b.totalOvertimeMinutes - a.totalOvertimeMinutes
    );

    // Calculate statistics
    const stats = {
      totalOvertimeMinutes: results.reduce((sum: number, r: any) => sum + r.totalOvertimeMinutes, 0),
      usersWithOvertime: results.length,
      averageOvertimePerUser:
        results.length > 0
          ? Math.round(
              results.reduce((sum: number, r: any) => sum + r.totalOvertimeMinutes, 0) /
                results.length
            )
          : 0,
      topOvertimeUser: results.length > 0 ? results[0] : null
    };

    return NextResponse.json(
      successResp("Overtime report generated", {
        period: { startDate: start, endDate: end },
        stats,
        data: results.map((r: any) => ({
          user: r.user,
          totalOvertimeHours: (r.totalOvertimeMinutes / 60).toFixed(2),
          daysWithOvertime: r.daysWithOvertime,
          sessions: r.sessions
        }))
      })
    );
  } catch (err: any) {
    console.error("[reports/overtime] error:", err);
    return NextResponse.json(
      errorResp("Failed to generate overtime report", err?.message || err),
      { status: 500 }
    );
  }
}
