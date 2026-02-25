import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { AttendanceLog } from "@/models/AttendanceLog";
import { User } from "@/models/User";
import { TimeSession } from "@/models/TimeSession";
import { TimeSessionBreak } from "@/models/TimeSessionBreak";
import { successResp, errorResp } from "@/lib/apiResponse";
import { startOfDay, endOfDay, eachDayOfInterval, format, parseISO } from "date-fns";

export async function GET(request: Request) {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get("auth_token")?.value;
        const payload = token ? verifyAuthToken(token) : null;

        if (!payload || (payload.role !== "admin" && payload.role !== "hr")) {
            return NextResponse.json(errorResp("Unauthorized: Admin or HR access only"), { status: 403 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const startDateStr = searchParams.get("startDate");
        const endDateStr = searchParams.get("endDate");
        const department = searchParams.get("department");
        const userId = searchParams.get("userId");
        const search = searchParams.get("search")?.toLowerCase() || "";

        if (!startDateStr || !endDateStr) {
            return NextResponse.json(errorResp("startDate and endDate are required"), { status: 400 });
        }

        const start = parseISO(startDateStr);
        const end = parseISO(endDateStr);
        const days = eachDayOfInterval({ start, end });

        // User filter
        const userFilter: any = { isDeleted: false, isActive: true };
        if (department && department !== "all") userFilter.department = department;
        if (userId) userFilter._id = userId;
        if (search) {
            userFilter.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        const users = await User.find(userFilter)
            .select("firstName lastName email avatarUrl department shiftHours role")
            .lean();

        const userIds = users.map(u => u._id);

        // Fetch logs for the range
        const logs = await AttendanceLog.find({
            userId: { $in: userIds },
            date: { $gte: startDateStr, $lte: endDateStr }
        }).lean();

        // Fetch sessions for the range (fallback/source of truth for durations)
        const sessions = await TimeSession.find({
            user: { $in: userIds },
            date: { $gte: startDateStr, $lte: endDateStr }
        }).lean();

        const now = new Date();

        const reportData = users.map((user: any) => {
            let totalWorkMs = 0;
            let totalOvertimeMs = 0;
            let totalBreakMs = 0;

            const dailyRecords = days.map(day => {
                const dStr = format(day, "yyyy-MM-dd");
                const log = logs.find(l => l.userId.toString() === user._id.toString() && l.date === dStr);
                const session = sessions.find(s => s.user.toString() === user._id.toString() && s.date === dStr);

                let workMs = log?.totalWorkMs || 0;
                let breakMs = log?.totalBreakMs || 0;
                let overtimeMs = log?.overtimeMs || 0;

                // If session exists but log has 0 workMs, or session is active, calculate live/fallback
                if (session) {
                    if (session.status === "completed") {
                        // Use completed session data if log is missing it
                        if (workMs === 0) workMs = (session.totalWorkMinutes || 0) * 60000;
                        if (breakMs === 0) breakMs = (session.totalBreakMinutes || 0) * 60000;
                    } else if (session.status === "active") {
                        // Live calculation for active session
                        const clockInMs = new Date(session.clockIn).getTime();
                        const elapsedMs = Math.max(0, now.getTime() - clockInMs);
                        const sessionBreakMs = (session.totalBreakMinutes || 0) * 60000;
                        workMs = Math.max(0, elapsedMs - sessionBreakMs);
                        breakMs = sessionBreakMs;
                    }
                }

                totalWorkMs += workMs;
                totalOvertimeMs += overtimeMs;
                totalBreakMs += breakMs;

                // Color logic helper
                const hours = workMs / 3600000;
                let intensity = 0;
                if (hours > 0 && hours <= 2) intensity = 1;
                else if (hours > 2 && hours <= 4) intensity = 2;
                else if (hours > 4 && hours <= 6) intensity = 3;
                else if (hours > 6 && hours <= 8) intensity = 4;
                else if (hours > 8 && hours <= 10) intensity = 5;
                else if (hours > 10) intensity = 6;

                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return {
                    date: dStr,
                    workMs,
                    breakMs,
                    overtimeMs,
                    intensity,
                    isRestDay: isWeekend && workMs === 0,
                    isHoliday: false,
                    isTimeOff: false,
                    checkInTime: log?.checkInTime || session?.clockIn,
                    checkOutTime: log?.checkOutTime || session?.clockOut,
                };
            });

            return {
                userId: user._id.toString(),
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                avatar: user.avatarUrl,
                department: user.department,
                shiftHours: user.shiftHours || 8,
                totalWorkMs,
                totalOvertimeMs,
                totalBreakMs,
                payrollHours: (totalWorkMs / 3600000).toFixed(2),
                dailyRecords
            };
        });

        return NextResponse.json(successResp("Reports retrieved", {
            period: { start: startDateStr, end: endDateStr },
            summary: {
                memberCount: users.length,
                totalOrganizationHours: (reportData.reduce((acc, r) => acc + r.totalWorkMs, 0) / 3600000).toFixed(2)
            },
            members: reportData
        }));
    } catch (err: any) {
        console.error("[api/reports] error:", err);
        return NextResponse.json(errorResp("Failed to fetch reports", err.message), { status: 500 });
    }
}
