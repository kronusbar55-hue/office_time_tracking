import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { TimeEntry } from "@/models/TimeEntry"; import { CheckInOut } from "@/models/CheckInOut";
import { User } from "@/models/User"; import { AuditLog } from "@/models/AuditLog";
import { AttendanceLog } from "@/models/AttendanceLog";
import { successResp, errorResp } from "@/lib/apiResponse";

type ProjectAllocation = {
    projectId: string;
    hours: number;
    notes?: string;
};

type ClockOutBody = {
    note?: string;
    clockOutType?: "web" | "mobile" | "kiosk";
    allocations?: ProjectAllocation[];
};

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

        let body: ClockOutBody | null = null;
        if (request.headers.get("content-type")?.includes("application/json")) {
            body = (await request.json().catch(() => null)) as ClockOutBody | null;
        }

        // Find active session for today
        const session = await TimeSession.findOne({
            user: payload.sub,
            date: dateStr,
            status: "active"
        });

        if (!session) {
            return NextResponse.json(
                errorResp("No active session to clock out"),
                { status: 409 }
            );
        }

        const now = new Date();
        const clockInTime = new Date(session.clockIn);
        const totalMinutes = Math.round((now.getTime() - clockInTime.getTime()) / 60000);
        const breakMinutes = session.totalBreakMinutes || 0;
        const workMinutes = totalMinutes - breakMinutes;

        const oldValues = {
            status: session.status,
            clockOut: session.clockOut,
            totalWorkMinutes: session.totalWorkMinutes
        };

        session.clockOut = now;
        session.status = "completed";
        session.totalWorkMinutes = Math.max(0, workMinutes);

        if (body?.note) {
            (session as any).clockOutNote = body.note;
        }

        await session.save();

        // Save project allocations to TimeEntry
        if (body?.allocations && body.allocations.length > 0) {
            const projectAllocations = body.allocations.map((alloc) => ({
                project: alloc.projectId,
                hours: alloc.hours,
                notes: alloc.notes || undefined
            }));

            await TimeEntry.create({
                user: payload.sub,
                clockIn: session.clockIn,
                clockOut: now,
                trackedMinutes: Math.max(0, workMinutes),
                projectAllocations,
                notes: body.note
            });
        }

        // Get user role
        const user = await User.findById(payload.sub).select("role").lean();

        // Calculate metrics
        const netWorkMinutes = Math.max(0, workMinutes);
        const isLateCheckIn = clockInTime.getHours() > 9 || (clockInTime.getHours() === 9 && clockInTime.getMinutes() > 0);
        const isEarlyCheckOut = netWorkMinutes < 480; // Less than 8 hours
        const isOvertime = netWorkMinutes > 540; // More than 9 hours
        const overtimeMinutes = isOvertime ? netWorkMinutes - 540 : 0;
        const attendancePercentage = Math.min(100, Math.round((netWorkMinutes / 480) * 100));

        // Save to CheckInOut collection
        await CheckInOut.findOneAndUpdate(
            {
                user: payload.sub,
                date: dateStr
            },
            {
                user: payload.sub,
                userRole: user?.role || "employee",
                date: dateStr,
                clockIn: session.clockIn,
                clockOut: now,
                workMinutes: netWorkMinutes,
                breakMinutes,
                deviceType: body?.clockOutType || "web",
                notes: body?.note,
                isLateCheckIn,
                isEarlyCheckOut,
                isOvertime,
                overtimeMinutes,
                attendancePercentage
            },
            { upsert: true, new: true }
        );

        // Update Live Attendance Log
        await AttendanceLog.findOneAndUpdate(
            { userId: payload.sub, date: dateStr },
            {
                status: "OUT",
                checkOutTime: now,
                lastActivityAt: now,
                totalWorkMs: netWorkMinutes * 60000,
                overtimeMs: overtimeMinutes * 60000,
                totalBreakMs: breakMinutes * 60000
            }
        );

        // Log to audit trail
        await AuditLog.create({
            action: "clock_out",
            user: payload.sub,
            affectedUser: payload.sub,
            entity: "TimeSession",
            entityId: session._id,
            oldValues,
            newValues: {
                status: session.status,
                clockOut: now.toISOString(),
                totalWorkMinutes: session.totalWorkMinutes,
                clockOutType: body?.clockOutType || "web",
                note: body?.note
            },
            ipAddress: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "",
            userAgent: headersList.get("user-agent") || ""
        });

        return NextResponse.json(
            successResp("Clocked out successfully", {
                id: session._id.toString(),
                clockIn: session.clockIn,
                clockOut: session.clockOut,
                workMinutes: session.totalWorkMinutes,
                breakMinutes: session.totalBreakMinutes,
                totalMinutes,
                metrics: {
                    isLateCheckIn,
                    isEarlyCheckOut,
                    isOvertime,
                    overtimeMinutes,
                    attendancePercentage
                }
            })
        );
    } catch (err: any) {
        console.error("[time-entries/clock-out] error:", err);
        return NextResponse.json(
            errorResp("Failed to clock out", err?.message || err),
            { status: 500 }
        );
    }
}
