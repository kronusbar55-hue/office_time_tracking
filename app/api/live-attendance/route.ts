import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { AttendanceLog } from "@/models/AttendanceLog";
import { User } from "@/models/User";
import { TimeSession } from "@/models/TimeSession";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function GET(request: Request) {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get("auth_token")?.value;
        const payload = token ? verifyAuthToken(token) : null;

        if (!payload || payload.role !== "admin") {
            return NextResponse.json(errorResp("Unauthorized: Admin access only"), { status: 403 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search")?.toLowerCase() || "";
        const filterStatus = searchParams.get("status"); // ALL, IN, BREAK, OUT

        const today = new Date().toISOString().split("T")[0];

        // Get all active users
        const users = await User.find({ isDeleted: false, isActive: true })
            .select("firstName lastName email avatarUrl technology role")
            .populate("technology", "name")
            .lean();

        // Get today's attendance logs
        const logs = await AttendanceLog.find({ date: today }).lean();

        // Get active time sessions for today
        const activeSessions = await TimeSession.find({ date: today, status: "active" }).lean();

        const members = users.map((user: any) => {
            const log = logs.find((l) => l.userId.toString() === user._id.toString());
            const session = activeSessions.find((s) => s.user.toString() === user._id.toString());

            let status = log?.status || "OUT";
            let lastActivityAt = log?.lastActivityAt || user.updatedAt || new Date();
            let checkInTime = log?.checkInTime || session?.clockIn;

            // Consistency check: If we have an active session, status must be IN or BREAK
            if (session && status === "OUT") {
                status = "IN";
            }

            return {
                userId: user._id.toString(),
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                avatar: user.avatarUrl,
                status: status,
                lastActivityAt: lastActivityAt,
                timezone: "GMT+5:30",
                checkInTime: checkInTime,
                checkOutTime: log?.checkOutTime,
                breaks: log?.breaks || []
            };
        });

        // Filtering
        let filteredMembers = members;
        if (search) {
            filteredMembers = filteredMembers.filter(m =>
                m.name.toLowerCase().includes(search) ||
                m.email.toLowerCase().includes(search)
            );
        }
        if (filterStatus && filterStatus !== "ALL") {
            filteredMembers = filteredMembers.filter(m => m.status === filterStatus);
        }

        // Summary calculation
        const summary = {
            total: members.length,
            in: members.filter(m => m.status === "IN").length,
            break: members.filter(m => m.status === "BREAK").length,
            out: members.filter(m => m.status === "OUT").length
        };

        return NextResponse.json(successResp("Live attendance retrieved", {
            summary,
            members: filteredMembers
        }));
    } catch (err: any) {
        console.error("[api/live-attendance] error:", err);
        return NextResponse.json(errorResp("Failed to fetch live attendance", err.message), { status: 500 });
    }
}
