import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { User } from "@/models/User";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { successResp, errorResp } from "@/lib/apiResponse";
import { getTenantContext } from "@/lib/tenantContext";

export async function GET(request: Request) {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get("auth_token")?.value;
        const payload = token ? verifyAuthToken(token) : null;

        if (!payload || (payload.role !== "admin" && payload.role !== "hr")) {
            return NextResponse.json(errorResp("Unauthorized: Admin or HR access only"), { status: 403 });
        }

        const tenantContext = await getTenantContext();
        const effectiveTenantId = tenantContext.effectiveTenantId;
        if (!effectiveTenantId) {
            return NextResponse.json(errorResp("Tenant not found"), { status: 403 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search")?.toLowerCase() || "";
        const filterStatus = searchParams.get("status"); // ALL, IN, BREAK, OUT

        const today = new Date().toISOString().split("T")[0];

        const users = await User.find({
            isDeleted: false,
            isActive: true,
            $or: [
                { tenantId: effectiveTenantId },
                { _id: effectiveTenantId }
            ]
        })
            .select("firstName lastName email avatarUrl technology role updatedAt")
            .populate("technology", "name")
            .lean();

        const userIds = users.map((user: any) => user._id.toString());

        const latestMonitorRecords = await EmployeeMonitor.aggregate([
            {
                $match: {
                    date: today,
                    userId: { $in: userIds }
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

                const upRaw = rawStatus.toUpperCase();
                if (upRaw === "IN_MEETING") {
                    status = "MEETING";
                } else if (["ACTIVE", "IDLE"].includes(upRaw)) {
                    status = "IN";
                } else if (upRaw === "ON_BREAK") {
                    status = "BREAK";
                } else {
                    status = "IN";
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
