import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { TimeSession } from "@/models/TimeSession";
import { CheckInOut } from "@/models/CheckInOut";
import { User } from "@/models/User";
import { EmployeeShift } from "@/models/EmployeeShift";
import { Shift, type IShift } from "@/models/Shift";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * POST /api/checkin-checkout/save
 * Save completed check-in/check-out sessions to historical records
 * This is called whenever someone clocks out
 */
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

    // Get User's Shift (Default to General if not found)
    let shift: IShift | null = null;

    // We need to fetch EmployeeShift and populate the 'shift' field.
    // Since we are using top-level imports, we can use the models directly.
    const empShift = await EmployeeShift.findOne({
      user: payload.sub,
      isActive: true
    }).populate("shift").lean();

    if (empShift && empShift.shift) {
      // The populated field might be an object or ID depending on mongoose setup/types.
      // Assuming straightforward population:
      shift = empShift.shift as unknown as IShift;
    } else {
      shift = await Shift.findOne({ isDefault: true, isActive: true }).lean() as IShift | null;
    }

    // Fallback values if no shift configured
    const shiftStartHour = shift ? parseInt(shift.startTime.split(':')[0]) : 9;
    const shiftStartMin = shift ? parseInt(shift.startTime.split(':')[1]) : 0;

    // Calculate total expected work minutes from Shift
    let shiftDurationMinutes = 540; // Default 9 hours
    if (shift) {
      const start = parseInt(shift.startTime.split(':')[0]) * 60 + parseInt(shift.startTime.split(':')[1]);
      const end = parseInt(shift.endTime.split(':')[0]) * 60 + parseInt(shift.endTime.split(':')[1]);
      // Handle overnight shifts if needed (end < start) -> add 24hrs
      let duration = end - start;
      if (duration < 0) duration += 1440;
      shiftDurationMinutes = duration;
    }

    // Calculate Session Metrics
    const clockIn = new Date(session.clockIn);
    const clockOut = session.clockOut ? new Date(session.clockOut) : new Date();
    // Gross session duration
    const sessionDuration = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60));
    const sessionBreak = session.totalBreakMinutes || 0;
    // Net work for this session
    const sessionWork = sessionDuration - sessionBreak;

    // --- DAILY AGGREGATION LOGIC ---

    // Find today's CheckInOut Record
    let record = await CheckInOut.findOne({
      user: payload.sub,
      date: session.date
    });

    if (!record) {
      // Create new Daily Record
      record = new CheckInOut({
        user: payload.sub,
        userRole: user.role,
        date: session.date,
        shift: shift ? shift._id : undefined,
        sessions: [],
        workMinutes: 0,
        breakMinutes: 0,
        status: "Present",
        attendancePercentage: 0
      });
    }

    // Add this session
    record.sessions.push({
      clockIn,
      clockOut,
      duration: sessionWork, // Net work
      location: (session as any).location,
      deviceType: (session as any).deviceType || "web",
      notes: (session as any).notes
    });

    // Recalculate Daily Totals
    // Break Minutes: Existing daily breaks + CURRENT session breaks
    // Note: The previous logic relied on `record.breakMinutes` which is 0 for new record.
    // If it's an existing record, we add the new session's break.
    record.breakMinutes = (record.breakMinutes || 0) + sessionBreak;

    // Total Work: Sum of (Net Work of all sessions)
    // Alternatively: Sum(Gross) - Total Breaks

    let totalNetWork = 0;
    record.sessions.forEach(s => {
      totalNetWork += s.duration; // s.duration is Net work per above push
    });

    record.workMinutes = totalNetWork;

    // --- SHIFT VALIDATION ---

    // 1. Late Check-In (Based on FIRST session)
    if (record.sessions.length > 0) {
      const firstClockIn = new Date(record.sessions[0].clockIn); // Ascending order mostly
      // Sort just in case? Usually pushed in order.

      const lateThreshold = new Date(firstClockIn);
      // Reset to Day start, then set hours
      // Note: parsing clock in date to get YYYY-MM-DD could be safer if overnight
      // But assuming check-in is "Today"
      lateThreshold.setHours(shiftStartHour, shiftStartMin + (shift ? shift.gracePeriod : 15), 0, 0);

      // If clockIn is different day than lateThreshold (overnight shift edge case), logic needs update.
      // For now standard day shift:
      if (firstClockIn > lateThreshold) {
        record.isLateCheckIn = true;
      }
    }

    // 2. Early Check-Out 
    // Logic: If Total Work < Expected Work - Leeway
    // Expected Work usually = Shift Duration - Default Break (e.g. 9hrs - 1hr = 8hrs work)
    const expectedWork = shiftDurationMinutes - (shift ? shift.breakDuration : 60);

    // Allow 15 mins leeway? Or strict? User said < 8 hours.
    // Let's use expectedWork.
    if (record.workMinutes < expectedWork) {
      record.isEarlyCheckOut = true;
    } else {
      record.isEarlyCheckOut = false;
    }

    // 3. Overtime
    // Logic: If Net Work > Shift Duration (9hrs) 
    // OR Net Work > Expected Work (8hrs)? 
    // Usually Overtime is > Shift End. 
    // User requirement: Overtime = Worked - Shift Hours (likely Expected Work)
    // But `isOvertime` usually implies significantly extra.
    // Let's stick to: if work > Shift Duration (9hrs total presence equivalent)
    if (record.workMinutes > shiftDurationMinutes) {
      record.isOvertime = true;
      record.overtimeMinutes = record.workMinutes - shiftDurationMinutes;
    } else {
      record.isOvertime = false;
      record.overtimeMinutes = 0;
    }

    // 4. Attendance %
    record.attendancePercentage = Math.min(100, Math.round((record.workMinutes / expectedWork) * 100));

    // 5. Status
    if (record.attendancePercentage >= 90) record.status = "Present";
    else if (record.attendancePercentage >= 45) record.status = "Half-Day";
    else record.status = "Absent"; // Or leave as is

    await record.save();

    return NextResponse.json(
      successResp("Check-in/out record saved successfully", {
        id: record._id,
        workMinutes: record.workMinutes,
        isOvertime: record.isOvertime,
        attendancePercentage: record.attendancePercentage
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
