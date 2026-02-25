import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { AuditLog } from "@/models/AuditLog";
import { AttendanceLog } from "@/models/AttendanceLog";
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

    // Check if already clocked in today
    const existing = await TimeSession.findOne({
      user: payload.sub,
      date: dateStr,
      status: "active"
    }).lean();

    if (existing) {
      return NextResponse.json(
        errorResp("You are already clocked in today"),
        { status: 409 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      note?: string;
      clockInType?: "web" | "mobile" | "kiosk";
    };

    const now = new Date();

    // Create new time session
    const session = await TimeSession.create({
      user: payload.sub,
      date: dateStr,
      clockIn: now,
      status: "active",
      totalWorkMinutes: 0,
      totalBreakMinutes: 0
    });

    // Update Live Attendance Log
    await AttendanceLog.findOneAndUpdate(
      { userId: payload.sub, date: dateStr },
      {
        userId: payload.sub,
        date: dateStr,
        status: "IN",
        checkInTime: now,
        lastActivityAt: now
      },
      { upsert: true, new: true }
    );

    // Log to audit trail
    await AuditLog.create({
      action: "clock_in",
      user: payload.sub,
      affectedUser: payload.sub,
      entity: "TimeSession",
      entityId: session._id,
      newValues: {
        date: dateStr,
        clockIn: now.toISOString(),
        clockInType: body.clockInType || "web",
        note: body.note
      },
      ipAddress: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "",
      userAgent: headersList.get("user-agent") || ""
    });

    return NextResponse.json(
      successResp("Clocked in successfully", {
        id: session._id.toString(),
        date: session.date,
        clockIn: session.clockIn
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[time-entries/clock-in] error:", err);
    return NextResponse.json(
      errorResp("Failed to clock in", err?.message || err),
      { status: 500 }
    );
  }
}

