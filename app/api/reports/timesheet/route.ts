import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId") || payload.sub; // Default to current user

    // Verify user has access (admin, HR, or own timesheet)
    if (payload.role !== "admin" && payload.role !== "hr" && userId !== payload.sub) {
      return NextResponse.json(
        errorResp("You don't have access to this timesheet"),
        { status: 403 }
      );
    }

    // Get date range (default: current week)
    let start = startDate;
    let end = endDate;

    if (!start || !end) {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - dayOfWeek);
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);

      start = firstDay.toISOString().split("T")[0];
      end = lastDay.toISOString().split("T")[0];
    }

    // Get sessions within date range
    const sessions = await TimeSession.find({
      user: userId,
      date: { $gte: start, $lte: end },
      status: "completed"
    })
      .populate("user", "firstName lastName email")
      .sort({ date: 1 })
      .lean();

    // Calculate daily summaries
    const dailySummaries: any[] = [];
    const dateMap = new Map();

    sessions.forEach((session: any) => {
      if (!dateMap.has(session.date)) {
        dateMap.set(session.date, {
          date: session.date,
          dayOfWeek: new Date(session.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
          sessions: [],
          totalWorkMinutes: 0,
          totalBreakMinutes: 0
        });
      }

      const day = dateMap.get(session.date);
      day.sessions.push({
        id: session._id.toString(),
        clockIn: session.clockIn,
        clockOut: session.clockOut,
        workMinutes: session.totalWorkMinutes,
        breakMinutes: session.totalBreakMinutes
      });
      day.totalWorkMinutes += session.totalWorkMinutes || 0;
      day.totalBreakMinutes += session.totalBreakMinutes || 0;
    });

    dailySummaries.push(...dateMap.values());

    // Calculate weekly summary
    const weeklySummary = {
      startDate: start,
      endDate: end,
      totalWorkMinutes: dailySummaries.reduce((sum: number, d: any) => sum + d.totalWorkMinutes, 0),
      totalBreakMinutes: dailySummaries.reduce((sum: number, d: any) => sum + d.totalBreakMinutes, 0),
      averageDailyWorkMinutes: dailySummaries.length > 0 ? Math.round(dailySummaries.reduce((sum: number, d: any) => sum + d.totalWorkMinutes, 0) / dailySummaries.length) : 0,
      daysWorked: dailySummaries.length
    };

    const user = sessions.length > 0 ? (sessions[0].user as any) : await User.findById(userId).select("firstName lastName email").lean();

    return NextResponse.json(
      successResp("Timesheet report generated", {
        user: {
          id: (user as any)?._id?.toString(),
          firstName: (user as any)?.firstName,
          lastName: (user as any)?.lastName,
          email: (user as any)?.email
        },
        period: { startDate: start, endDate: end },
        summary: weeklySummary,
        dailySummaries
      })
    );
  } catch (err: any) {
    console.error("[reports/timesheet] error:", err);
    return NextResponse.json(
      errorResp("Failed to generate timesheet report", err?.message || err),
      { status: 500 }
    );
  }
}
