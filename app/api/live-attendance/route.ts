import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { User } from "@/models/User";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
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
            .select("firstName lastName email avatarUrl technology role updatedAt")
            .populate("technology", "name")
            .lean();

        const userIds = users.map((u: any) => u._id.toString());

        // Get the latest monitor record for each user for today using aggregation
        const latestMonitorRecords = await EmployeeMonitor.aggregate([
            {
                $match: {
                    userId: { $in: userIds },
                    date: today
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: "$userId",
                    latestRecord: { $first: "$$ROOT" }
                }
            }
        ]);

        const monitorMap = new Map();
        latestMonitorRecords.forEach(rec => {
            monitorMap.set(rec._id, rec.latestRecord);
        });

        const members = users.map((user: any) => {
            const latest = monitorMap.get(user._id.toString());

            let status: "IN" | "BREAK" | "OUT" | "MEETING" = "OUT";
            let lastActivityAt = user.updatedAt || new Date();
            let rawStatus = "OFFLINE";

            if (latest) {
                rawStatus = latest.status || "IDLE";
                lastActivityAt = latest.createdAt;

                // Map monitor status to UI status
                const upRaw = rawStatus.toUpperCase();
                if (upRaw === "IN_MEETING") {
                    status = "MEETING";
                } else if (["ACTIVE", "IDLE"].includes(upRaw)) {
                    status = "IN";
                } else if (upRaw === "ON_BREAK") {
                    status = "BREAK";
                } else {
                    status = "IN"; // Default to IN if we have a record
                }
            }

            return {
                userId: user._id.toString(),
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                avatar: user.avatarUrl,
                status: status,
                rawStatus: rawStatus,
                lastActivityAt: lastActivityAt,
                timezone: latest?.timezone || "GMT+5:30",
                sessionTime: latest?.sessionTime || "00:00:00",
                breakTime: latest?.breakTime || "00:00:00"
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
            meeting: members.filter(m => m.status === "MEETING").length,
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
