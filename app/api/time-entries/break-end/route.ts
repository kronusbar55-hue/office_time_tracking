import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { TimeSessionBreak } from "@/models/TimeSessionBreak";
import { AuditLog } from "@/models/AuditLog";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const headersList = headers();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    // Get today's date
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];

    // Find active session for today
    const session = await TimeSession.findOne({
      user: payload.sub,
      date: dateStr,
      status: "active"
    });

    if (!session) {
      return NextResponse.json(
        errorResp("No active session"),
        { status: 409 }
      );
    }

    // Find active break
    const activeBreak = await TimeSessionBreak.findOne({
      timeSession: session._id,
      breakEnd: null
    });

    if (!activeBreak) {
      return NextResponse.json(
        errorResp("No active break to end"),
        { status: 409 }
      );
    }

    const now = new Date();
    const breakStartTime = new Date(activeBreak.breakStart);
    const breakDurationMinutes = Math.round((now.getTime() - breakStartTime.getTime()) / 60000);

    const oldValues = {
      breakEnd: activeBreak.breakEnd,
      durationMinutes: activeBreak.durationMinutes
    };

    activeBreak.breakEnd = now;
    activeBreak.durationMinutes = breakDurationMinutes;

    await activeBreak.save();

    // Update session total break minutes
    const allBreaks = await TimeSessionBreak.find({ timeSession: session._id }).lean();
    const totalBreakMinutes = allBreaks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

    session.totalBreakMinutes = totalBreakMinutes;
    await session.save();

    // Log to audit trail
    await AuditLog.create({
      action: "break_end",
      user: payload.sub,
      affectedUser: payload.sub,
      entity: "TimeSessionBreak",
      entityId: activeBreak._id,
      oldValues,
      newValues: {
        breakEnd: now.toISOString(),
        durationMinutes: breakDurationMinutes
      },
      ipAddress: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "",
      userAgent: headersList.get("user-agent") || ""
    });

    return NextResponse.json(
      successResp("Break ended", {
        id: activeBreak._id.toString(),
        breakEnd: activeBreak.breakEnd,
        durationMinutes: activeBreak.durationMinutes,
        totalBreakMinutes
      })
    );
  } catch (err: any) {
    console.error("[time-entries/break-end] error:", err);
    return NextResponse.json(
      errorResp("Failed to end break", err?.message || err),
      { status: 500 }
    );
  }
}
