import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
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

    // Only admin and manager can create manual entries
    if (payload.role !== "admin" && payload.role !== "manager") {
      return NextResponse.json(
        errorResp("You don't have permission to create manual entries"),
        { status: 403 }
      );
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      userId: string;
      date: string; // YYYY-MM-DD
      clockIn: string; // ISO datetime
      clockOut: string; // ISO datetime
      reason: string;
    };

    // Validate required fields
    if (!body.userId || !body.date || !body.clockIn || !body.clockOut || !body.reason) {
      return NextResponse.json(
        errorResp("Missing required fields: userId, date, clockIn, clockOut, reason"),
        { status: 400 }
      );
    }

    // Check if session already exists for this date
    const existing = await TimeSession.findOne({
      user: body.userId,
      date: body.date
    });

    if (existing) {
      return NextResponse.json(
        errorResp("A time entry already exists for this user on this date"),
        { status: 409 }
      );
    }

    const clockInTime = new Date(body.clockIn);
    const clockOutTime = new Date(body.clockOut);

    if (clockOutTime <= clockInTime) {
      return NextResponse.json(
        errorResp("Clock out time must be after clock in time"),
        { status: 400 }
      );
    }

    const workMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / 60000);

    // Create manual entry
    const session = await TimeSession.create({
      user: body.userId,
      date: body.date,
      clockIn: clockInTime,
      clockOut: clockOutTime,
      status: "completed",
      totalWorkMinutes: workMinutes,
      totalBreakMinutes: 0
    });

    // Log to audit trail
    await AuditLog.create({
      action: "manual_entry_create",
      user: payload.sub,
      affectedUser: body.userId,
      entity: "TimeSession",
      entityId: session._id,
      reason: body.reason,
      newValues: {
        date: body.date,
        clockIn: body.clockIn,
        clockOut: body.clockOut,
        workMinutes,
        reason: body.reason
      },
      ipAddress: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "",
      userAgent: headersList.get("user-agent") || ""
    });

    return NextResponse.json(
      successResp("Manual time entry created", {
        id: session._id.toString(),
        userId: session.user.toString(),
        date: session.date,
        clockIn: session.clockIn,
        clockOut: session.clockOut,
        workMinutes
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[time-entries/manual] error:", err);
    return NextResponse.json(
      errorResp("Failed to create manual entry", err?.message || err),
      { status: 500 }
    );
  }
}

// Update manual entry
export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const headersList = headers();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    // Only admin can update manual entries
    if (payload.role !== "admin") {
      return NextResponse.json(
        errorResp("Only admins can update manual entries"),
        { status: 403 }
      );
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      id: string;
      clockIn?: string;
      clockOut?: string;
      reason?: string;
    };

    if (!body.id) {
      return NextResponse.json(errorResp("Missing session ID"), { status: 400 });
    }

    const session = await TimeSession.findById(body.id);

    if (!session) {
      return NextResponse.json(errorResp("Time session not found"), { status: 404 });
    }

    const oldValues = {
      clockIn: session.clockIn,
      clockOut: session.clockOut,
      totalWorkMinutes: session.totalWorkMinutes
    };

    if (body.clockIn) {
      session.clockIn = new Date(body.clockIn);
    }

    if (body.clockOut) {
      session.clockOut = new Date(body.clockOut);
    }

    // Recalculate work minutes
    if (session.clockIn && session.clockOut) {
      const workMinutes = Math.round((session.clockOut.getTime() - session.clockIn.getTime()) / 60000);
      session.totalWorkMinutes = Math.max(0, workMinutes - (session.totalBreakMinutes || 0));
    }

    await session.save();

    // Log to audit trail
    await AuditLog.create({
      action: "manual_entry_update",
      user: payload.sub,
      affectedUser: session.user.toString(),
      entity: "TimeSession",
      entityId: session._id,
      reason: body.reason,
      oldValues,
      newValues: {
        clockIn: session.clockIn.toISOString(),
        clockOut: session.clockOut?.toISOString(),
        totalWorkMinutes: session.totalWorkMinutes
      },
      ipAddress: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "",
      userAgent: headersList.get("user-agent") || ""
    });

    return NextResponse.json(
      successResp("Manual entry updated", {
        id: session._id.toString(),
        clockIn: session.clockIn,
        clockOut: session.clockOut,
        workMinutes: session.totalWorkMinutes
      })
    );
  } catch (err: any) {
    console.error("[time-entries/manual] PUT error:", err);
    return NextResponse.json(
      errorResp("Failed to update manual entry", err?.message || err),
      { status: 500 }
    );
  }
}

// Delete manual entry (soft or hard)
export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies();
    const headersList = headers();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    // Only admin can delete manual entries
    if (payload.role !== "admin") {
      return NextResponse.json(
        errorResp("Only admins can delete manual entries"),
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");
    const reason = searchParams.get("reason") || "No reason provided";

    if (!sessionId) {
      return NextResponse.json(errorResp("Missing session ID"), { status: 400 });
    }

    const session = await TimeSession.findById(sessionId);

    if (!session) {
      return NextResponse.json(errorResp("Time session not found"), { status: 404 });
    }

    const oldValues = {
      clockIn: session.clockIn,
      clockOut: session.clockOut,
      status: session.status
    };

    // Mark as deleted
    await TimeSession.deleteOne({ _id: sessionId });

    // Log to audit trail
    await AuditLog.create({
      action: "manual_entry_delete",
      user: payload.sub,
      affectedUser: session.user.toString(),
      entity: "TimeSession",
      entityId: session._id,
      reason,
      oldValues,
      ipAddress: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "",
      userAgent: headersList.get("user-agent") || ""
    });

    return NextResponse.json(successResp("Manual entry deleted"));
  } catch (err: any) {
    console.error("[time-entries/manual] DELETE error:", err);
    return NextResponse.json(
      errorResp("Failed to delete manual entry", err?.message || err),
      { status: 500 }
    );
  }
}
