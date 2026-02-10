import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { successResp, errorResp } from "@/lib/apiResponse";

const STANDARD_START_TIME = 9; // 9 AM

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    // Only admin and HR can access late arrival reports
    if (payload.role !== "admin" && payload.role !== "hr") {
      return NextResponse.json(
        errorResp("You don't have access to late arrival reports"),
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

    let query: any = { date: { $gte: start, $lte: end } };
    if (userId) {
      query.user = userId;
    }

    // Get sessions
    const sessions = await TimeSession.find(query)
      .populate("user", "firstName lastName email")
      .sort({ clockIn: -1 })
      .lean();

    // Filter late arrivals
    const lateArrivals = sessions.filter((session: any) => {
      const clockInTime = new Date(session.clockIn);
      return clockInTime.getHours() >= STANDARD_START_TIME;
    });

    // Group by user
    const lateByUser = new Map();

    lateArrivals.forEach((session: any) => {
      const userId = session.user?._id?.toString();
      const clockInTime = new Date(session.clockIn);
      const lateMinutes = (clockInTime.getHours() - STANDARD_START_TIME) * 60 + clockInTime.getMinutes();

      if (!lateByUser.has(userId)) {
        lateByUser.set(userId, {
          user: {
            id: session.user?._id?.toString(),
            firstName: session.user?.firstName,
            lastName: session.user?.lastName,
            email: session.user?.email
          },
          totalLateMinutes: 0,
          lateCount: 0,
          records: []
        });
      }

      const userData = lateByUser.get(userId);
      userData.totalLateMinutes += lateMinutes;
      userData.lateCount += 1;
      userData.records.push({
        id: session._id.toString(),
        date: session.date,
        clockIn: session.clockIn,
        lateMinutes,
        workMinutes: session.totalWorkMinutes
      });
    });

    // Convert to array and sort
    const results = Array.from(lateByUser.values()).sort(
      (a: any, b: any) => b.lateCount - a.lateCount
    );

    // Calculate statistics
    const stats = {
      totalLateArrivals: lateArrivals.length,
      usersWithLateArrivals: results.length,
      averageLateMinutes: lateArrivals.length > 0 ? Math.round(lateArrivals.reduce((sum: number, s: any) => sum + ((new Date(s.clockIn).getHours() - STANDARD_START_TIME) * 60 + new Date(s.clockIn).getMinutes()), 0) / lateArrivals.length) : 0
    };

    return NextResponse.json(
      successResp("Late arrival report generated", {
        period: { startDate: start, endDate: end },
        standardStartTime: `${STANDARD_START_TIME}:00 AM`,
        stats,
        data: results.map((r: any) => ({
          user: r.user,
          lateCount: r.lateCount,
          totalLateMinutes: r.totalLateMinutes,
          averageLateMinutes: Math.round(r.totalLateMinutes / r.lateCount),
          records: r.records
        }))
      })
    );
  } catch (err: any) {
    console.error("[reports/late-arrivals] error:", err);
    return NextResponse.json(
      errorResp("Failed to generate late arrival report", err?.message || err),
      { status: 500 }
    );
  }
}
