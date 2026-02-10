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

    // Only admin and HR can access attendance reports
    if (payload.role !== "admin" && payload.role !== "hr") {
      return NextResponse.json(
        errorResp("You don't have access to attendance reports"),
        { status: 403 }
      );
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate"); // YYYY-MM-DD
    const endDate = searchParams.get("endDate"); // YYYY-MM-DD
    const userId = searchParams.get("userId");
    const format = searchParams.get("format") || "json"; // json, csv, excel, pdf

    let query: any = {};

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else {
      // Default: last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const endDateStr = today.toISOString().split("T")[0];
      const startDateStr = thirtyDaysAgo.toISOString().split("T")[0];

      query.date = { $gte: startDateStr, $lte: endDateStr };
    }

    if (userId) {
      query.user = userId;
    }

    // Get attendance records
    const records = await TimeSession.find(query)
      .populate("user", "firstName lastName email role")
      .sort({ date: -1, clockIn: -1 })
      .lean();

    // Aggregate statistics
    const stats = {
      totalRecords: records.length,
      totalUsers: new Set(records.map((r: any) => r.user?._id?.toString())).size,
      averageWorkMinutes:
        records.length > 0
          ? Math.round(
              records.reduce((sum: number, r: any) => sum + (r.totalWorkMinutes || 0), 0) /
                records.length
            )
          : 0,
      completedSessions: records.filter((r: any) => r.status === "completed").length,
      activeSessions: records.filter((r: any) => r.status === "active").length
    };

    // Prepare response
    const response = {
      success: true,
      data: {
        stats,
        records: records.map((r: any) => ({
          id: r._id.toString(),
          user: {
            id: r.user?._id?.toString(),
            firstName: r.user?.firstName,
            lastName: r.user?.lastName,
            email: r.user?.email
          },
          date: r.date,
          clockIn: r.clockIn,
          clockOut: r.clockOut,
          status: r.status,
          workMinutes: r.totalWorkMinutes,
          breakMinutes: r.totalBreakMinutes
        })),
        exportUrl: format !== "json" ? `/api/reports/attendance/export?format=${format}&startDate=${startDate}&endDate=${endDate}` : null
      }
    };

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("[reports/attendance] error:", err);
    return NextResponse.json(
      errorResp("Failed to generate attendance report", err?.message || err),
      { status: 500 }
    );
  }
}
