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
        errorResp("No active session. Clock in first."),
        { status: 409 }
      );
    }

    // Check if already on break
    const activeBreak = await TimeSessionBreak.findOne({
      timeSession: session._id,
      breakEnd: null
    }).lean();

    if (activeBreak) {
      return NextResponse.json(
        errorResp("You are already on break"),
        { status: 409 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      reason?: string;
    };

    const now = new Date();

    // Create break record
    const breakRecord = await TimeSessionBreak.create({
      timeSession: session._id,
      breakStart: now,
      reason: body.reason || "Unspecified"
    });

    // Log to audit trail
    await AuditLog.create({
      action: "break_start",
      user: payload.sub,
      affectedUser: payload.sub,
      entity: "TimeSessionBreak",
      entityId: breakRecord._id,
      newValues: {
        breakStart: now.toISOString(),
        reason: body.reason || "Unspecified"
      },
      ipAddress: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "",
      userAgent: headersList.get("user-agent") || ""
    });

    return NextResponse.json(
      successResp("Break started", {
        id: breakRecord._id.toString(),
        breakStart: breakRecord.breakStart,
        reason: breakRecord.reason
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[time-entries/break-start] error:", err);
    return NextResponse.json(
      errorResp("Failed to start break", err?.message || err),
      { status: 500 }
    );
  }
}
