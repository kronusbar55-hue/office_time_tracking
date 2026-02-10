import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { TimeSession } from "@/models/TimeSession";
import { CheckInOut } from "@/models/CheckInOut";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * POST /api/checkin-checkout/save
 * Save completed check-in/check-out sessions to historical records
 * This is called whenever someone clocks out
 */
export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      timeSessionId?: string;
    };

    // Get user info
    const user = await User.findById(payload.sub).lean();
    if (!user) {
      return NextResponse.json(errorResp("User not found"), { status: 404 });
    }

    // Get time session
    let session = null;
    if (body.timeSessionId) {
      session = await TimeSession.findById(body.timeSessionId).lean();
    } else {
      // Get today's active session
      const today = new Date().toISOString().split("T")[0];
      session = await TimeSession.findOne({
        user: payload.sub,
        date: today,
        clockOut: { $exists: true, $ne: null },
        status: "completed"
      }).lean();
    }

    if (!session) {
      return NextResponse.json(errorResp("Session not found"), { status: 404 });
    }

    // Calculate metrics
    const clockIn = new Date(session.clockIn);
    const clockOut = session.clockOut ? new Date(session.clockOut) : new Date();
    const workMinutes = session.totalWorkMinutes || Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60));
    const breakMinutes = session.totalBreakMinutes || 0;
    const netWorkMinutes = workMinutes - breakMinutes;

    // Determine if late check-in (after 9 AM)
    const isLateCheckIn = clockIn.getHours() > 9 || (clockIn.getHours() === 9 && clockIn.getMinutes() > 0);

    // Determine if early check-out (before 5 PM or less than 8 hours)
    const isEarlyCheckOut = netWorkMinutes < 480; // 8 hours = 480 minutes

    // Determine if overtime (more than 9 hours)
    const isOvertime = netWorkMinutes > 540; // 9 hours = 540 minutes
    const overtimeMinutes = isOvertime ? netWorkMinutes - 540 : 0;

    // Calculate attendance percentage (0-100)
    const attendancePercentage = Math.min(100, Math.round((netWorkMinutes / 480) * 100)); // Based on 8 hour standard

    // Check if record already exists
    const existing = await CheckInOut.findOne({
      user: payload.sub,
      date: session.date,
      clockIn: session.clockIn
    });

    let record;

    if (existing) {
      // Update existing record
      record = await CheckInOut.findByIdAndUpdate(
        existing._id,
        {
          clockOut,
          workMinutes: netWorkMinutes,
          breakMinutes,
          isOvertime,
          isLateCheckIn,
          isEarlyCheckOut,
          overtimeMinutes,
          attendancePercentage,
          userRole: user.role,
          ...((session as any).location && { location: (session as any).location }),
          ...((session as any).deviceType && { deviceType: (session as any).deviceType }),
          ...((session as any).notes && { notes: (session as any).notes })
        },
        { new: true }
      );
    } else {
      // Create new record
      record = await CheckInOut.create({
        user: payload.sub,
        userRole: user.role,
        date: session.date,
        clockIn,
        clockOut,
        workMinutes: netWorkMinutes,
        breakMinutes,
        location: (session as any).location,
        deviceType: (session as any).deviceType || "web",
        notes: (session as any).notes,
        isOvertime,
        isLateCheckIn,
        isEarlyCheckOut,
        attendancePercentage,
        overtimeMinutes
      });
    }

    return NextResponse.json(
      successResp("Check-in/out record saved successfully", {
        id: record._id,
        workMinutes: netWorkMinutes,
        breakMinutes,
        isOvertime,
        overtimeMinutes,
        attendancePercentage
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[checkin-checkout/save] error:", err);
    return NextResponse.json(
      errorResp("Failed to save record", err?.message),
      { status: 500 }
    );
  }
}

/**
 * GET /api/checkin-checkout/save
 * Get today's check-in/check-out record
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
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const record = await CheckInOut.findOne({
      user: payload.sub,
      date
    }).populate("user", "firstName lastName email");

    if (!record) {
      return NextResponse.json(successResp("No record found", null));
    }

    return NextResponse.json(successResp("Record retrieved", record));
  } catch (err: any) {
    console.error("[checkin-checkout/save] error:", err);
    return NextResponse.json(
      errorResp("Failed to get record", err?.message),
      { status: 500 }
    );
  }
}
