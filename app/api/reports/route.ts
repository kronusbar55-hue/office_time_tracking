import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { User } from "@/models/User";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { successResp, errorResp } from "@/lib/apiResponse";
import { startOfDay, endOfDay, eachDayOfInterval, format, parseISO } from "date-fns";
import { timeToMinutes } from "@/lib/monitorUtils";

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
        const dateStrings = days.map(d => format(d, "yyyy-MM-dd"));

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

        const userIds = users.map((u: any) => u._id.toString());

        // Aggregate all monitor data for the range at once
        const monitorData = await EmployeeMonitor.aggregate([
            {
                $match: {
                    userId: { $in: userIds },
                    date: { $in: dateStrings }
                }
            },
            {
                $group: {
                    _id: { userId: "$userId", date: "$date" },
                    workSeconds: { $sum: "$activeSeconds" },
                    idleSeconds: { $sum: "$idleSeconds" },
                    maxBreak: { $max: "$breakTime" },
                    maxSession: { $max: "$sessionTime" },
                    firstIn: { $min: "$createdAt" },
                    lastOut: { $max: "$createdAt" }
                }
            }
        ]);

        const dataMap = new Map();
        monitorData.forEach(d => {
            dataMap.set(`${d._id.userId}_${d._id.date}`, d);
        });

        const reportData = users.map((user: any) => {
            let totalWorkMs = 0;
            let totalBreakMs = 0;

            const dailyRecords = dateStrings.map(dStr => {
                const dayData = dataMap.get(`${user._id.toString()}_${dStr}`);

                const breakMs = timeToMinutes(dayData?.maxBreak || "00:00:00") * 60000;
                
                // Calculate session based on first and last screenshot/record times
                let sessionMs = 0;
                if (dayData?.firstIn && dayData?.lastOut) {
                    sessionMs = new Date(dayData.lastOut).getTime() - new Date(dayData.firstIn).getTime();
                } else if (dayData?.maxSession) {
                    sessionMs = timeToMinutes(dayData.maxSession) * 60000;
                }

                let workMs = Math.max(0, sessionMs - breakMs);
                
                // Fallback to active + idle if session is empty (e.g. single record only)
                if (sessionMs === 0) {
                    workMs = ((dayData?.workSeconds || 0) + (dayData?.idleSeconds || 0)) * 1000;
                }

                totalWorkMs += workMs;
                totalBreakMs += breakMs;

                const hours = workMs / 3600000;
                let intensity = 0;
                if (hours > 0 && hours <= 2) intensity = 1;
                else if (hours > 2 && hours <= 4) intensity = 2;
                else if (hours > 4 && hours <= 6) intensity = 3;
                else if (hours > 6 && hours <= 8) intensity = 4;
                else if (hours > 8 && hours <= 10) intensity = 5;
                else if (hours > 10) intensity = 6;

                const dayObj = parseISO(dStr);
                const isWeekend = dayObj.getDay() === 0 || dayObj.getDay() === 6;

                return {
                    date: dStr,
                    workMs,
                    breakMs,
                    overtimeMs: 0,
                    intensity,
                    isRestDay: isWeekend && workMs === 0,
                    isHoliday: false,
                    isTimeOff: false,
                    checkInTime: dayData?.firstIn,
                    checkOutTime: dayData?.lastOut,
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
                totalOvertimeMs: 0,
                totalBreakMs,
                payrollHours: totalWorkMs / 3600000,
                dailyRecords
            };
        });

        return NextResponse.json(successResp("Reports retrieved", {
            period: { start: startDateStr, end: endDateStr },
            summary: {
                memberCount: users.length,
                totalOrganizationHours: reportData.reduce((acc, r) => acc + r.totalWorkMs, 0) / 3600000
            },
            members: reportData
        }));
    } catch (err: any) {
        console.error("[api/reports] error:", err);
        return NextResponse.json(errorResp("Failed to fetch reports", err.message), { status: 500 });
    }
}
