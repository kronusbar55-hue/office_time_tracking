import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    // Only admin and HR can view who is working
    if (payload.role !== "admin" && payload.role !== "hr") {
      return NextResponse.json(
        errorResp("You don't have access to this information"),
        { status: 403 }
      );
    }

    await connectDB();

    // Get today's date
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];

    // Get all active sessions for today
    const activeSessions = await TimeSession.find({
      date: dateStr,
      status: "active"
    })
      .populate("user", "firstName lastName email role")
      .sort({ clockIn: -1 })
      .lean();

    // Calculate work time for each user
    const now = new Date();
    const sessionsWithWorkTime = activeSessions.map((session: any) => {
      const clockInTime = new Date(session.clockIn);
      const elapsedMinutes = Math.round((now.getTime() - clockInTime.getTime()) / 60000);
      const breakMinutes = session.totalBreakMinutes || 0;
      const workMinutes = Math.max(0, elapsedMinutes - breakMinutes);

      return {
        id: session._id.toString(),
        user: {
          id: (session as any).user?._id?.toString(),
          firstName: (session as any).user?.firstName,
          lastName: (session as any).user?.lastName,
          email: (session as any).user?.email,
          role: (session as any).user?.role
        },
        clockIn: session.clockIn,
        elapsedMinutes,
        workMinutes,
        breakMinutes,
        status: "active"
      };
    });

    return NextResponse.json(
      successResp("Currently working users", {
        timestamp: now.toISOString(),
        count: sessionsWithWorkTime.length,
        users: sessionsWithWorkTime
      })
    );
  } catch (err: any) {
    console.error("[time-entries/who-is-working] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve who is working", err?.message || err),
      { status: 500 }
    );
  }
}
