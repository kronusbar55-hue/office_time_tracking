import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { CheckInOut } from "@/models/CheckInOut";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";
import { format } from "date-fns";

/**
 * GET /api/checkin-checkout/today-summary
 * Get today's check-in/check-out summary for dashboard
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

    const today = format(new Date(), "yyyy-MM-dd");

    // Get current user
    const currentUser = await User.findById(payload.sub).lean();

    // Get today's record for current user or all if HR/Admin
    let query: any = { date: today };

    if (currentUser?.role === "employee") {
      query.user = payload.sub;
    } else if (currentUser?.role === "manager") {
      // Managers can see their team
      const teamMembers = await User.find({ manager: payload.sub }).select("_id");
      const teamIds = teamMembers.map((m) => m._id);
      query.$or = [{ user: payload.sub }, { user: { $in: teamIds } }];
    }
    // Admin and HR can see all

    const records = await CheckInOut.find(query)
      .populate("user", "firstName lastName email role avatarUrl")
      .lean();

    // Calculate summary
    const summary = {
      totalRecords: records.length,
      checkedIn: records.filter((r: any) => r.clockIn && !r.clockOut).length,
      checkedOut: records.filter((r: any) => r.clockOut).length,
      averageWorkHours: 0,
      overtimeCount: records.filter((r: any) => r.isOvertime).length,
      lateCount: records.filter((r: any) => r.isLateCheckIn).length,
      issues: {
        late: records.filter((r: any) => r.isLateCheckIn).length,
        earlyOut: records.filter((r: any) => r.isEarlyCheckOut).length,
        overtime: records.filter((r: any) => r.isOvertime).length
      }
    };

    if (records.length > 0) {
      summary.averageWorkHours = Math.round(
        (records.reduce((sum: number, r: any) => sum + ((r.workMinutes || 0) / 60), 0) / records.length) * 100
      ) / 100;
    }

    return NextResponse.json(
      successResp("Summary retrieved successfully", {
        summary,
        date: today,
        recordCount: records.length
      })
    );
  } catch (err: any) {
    console.error("[checkin-checkout/today-summary] error:", err);
    return NextResponse.json(
      errorResp("Failed to get summary", err?.message),
      { status: 500 }
    );
  }
}
