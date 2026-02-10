import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { TimeSessionBreak } from "@/models/TimeSessionBreak";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    // Only admin and HR can access break reports
    if (payload.role !== "admin" && payload.role !== "hr") {
      return NextResponse.json(
        errorResp("You don't have access to break reports"),
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

    let sessionQuery: any = { date: { $gte: start, $lte: end } };
    if (userId) {
      sessionQuery.user = userId;
    }

    // Get all sessions in date range
    const sessions = await TimeSession.find(sessionQuery)
      .populate("user", "firstName lastName email")
      .lean();

    // Get all breaks for these sessions
    const sessionIds = sessions.map((s: any) => s._id);
    const breaks = await TimeSessionBreak.find({
      timeSession: { $in: sessionIds },
      breakEnd: { $ne: null }
    })
      .populate({
        path: "timeSession",
        select: "user date",
        populate: { path: "user", select: "firstName lastName email" }
      })
      .sort({ breakStart: -1 })
      .lean();

    // Aggregate by user
    const breaksByUser = new Map();
    let totalBreakMinutes = 0;

    breaks.forEach((breakRecord: any) => {
      const userId = (breakRecord as any).timeSession?.user?._id?.toString();
      const breakMinutes = breakRecord.durationMinutes || 0;
      totalBreakMinutes += breakMinutes;

      if (!breaksByUser.has(userId)) {
        breaksByUser.set(userId, {
          user: {
            id: (breakRecord as any).timeSession?.user?._id?.toString(),
            firstName: (breakRecord as any).timeSession?.user?.firstName,
            lastName: (breakRecord as any).timeSession?.user?.lastName,
            email: (breakRecord as any).timeSession?.user?.email
          },
          totalBreakMinutes: 0,
          breakCount: 0,
          breaks: []
        });
      }

      const userData = breaksByUser.get(userId);
      userData.totalBreakMinutes += breakMinutes;
      userData.breakCount += 1;
      userData.breaks.push({
        id: breakRecord._id.toString(),
        date: (breakRecord as any).timeSession?.date,
        breakStart: breakRecord.breakStart,
        breakEnd: breakRecord.breakEnd,
        durationMinutes: breakMinutes,
        reason: (breakRecord as any).reason || "Unspecified"
      });
    });

    // Convert to array and sort
    const results = Array.from(breaksByUser.values()).sort(
      (a: any, b: any) => b.totalBreakMinutes - a.totalBreakMinutes
    );

    // Calculate statistics
    const stats = {
      totalBreakMinutes,
      averageBreakMinutesPerSession: breaks.length > 0 ? Math.round(totalBreakMinutes / breaks.length) : 0,
      totalBreakSessions: breaks.length,
      usersWithBreaks: results.length
    };

    return NextResponse.json(
      successResp("Break report generated", {
        period: { startDate: start, endDate: end },
        stats,
        data: results.map((r: any) => ({
          user: r.user,
          totalBreakHours: (r.totalBreakMinutes / 60).toFixed(2),
          breakCount: r.breakCount,
          averageBreakLength: Math.round(r.totalBreakMinutes / r.breakCount),
          breaks: r.breaks
        }))
      })
    );
  } catch (err: any) {
    console.error("[reports/breaks] error:", err);
    return NextResponse.json(
      errorResp("Failed to generate break report", err?.message || err),
      { status: 500 }
    );
  }
}
