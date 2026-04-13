import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { User } from "@/models/User";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getTenantContext } from "@/lib/tenantContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get("auth_token")?.value;
        const payload = token ? verifyAuthToken(token) as any : null;

        if (!payload) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const tenantContext = await getTenantContext();
        const effectiveTenantId = tenantContext.effectiveTenantId;
        if (!effectiveTenantId) {
            return NextResponse.json({ success: false, message: "Tenant not found" }, { status: 403 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        let userId = searchParams.get("userId");
        const dateParam = searchParams.get("date"); // YYYY-MM-DD
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "12");

        if (payload.role !== "admin") {
            userId = payload.sub;
        }

        if (!userId || userId === "all") {
            return NextResponse.json({
                success: true,
                data: [],
                pagination: {
                    totalActiveRecords: 0,
                    totalPages: 0,
                    currentPage: page,
                    limit
                }
            });
        }

        const selectedUser = await User.findOne({
            _id: userId,
            isDeleted: false,
            $or: [{ tenantId: effectiveTenantId }, { _id: effectiveTenantId }]
        }).select("_id").lean();

        if (!selectedUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
        }

        const monitorMatch: any = { userId: userId };
        if (dateParam) {
            monitorMatch.date = dateParam;
        }

        const [employees, totalRecords, monitorData, summaryAgg] = await Promise.all([
          User.find({ _id: userId, isDeleted: false }, "firstName lastName avatarUrl").lean(),
          EmployeeMonitor.countDocuments(monitorMatch),
          EmployeeMonitor.find(monitorMatch)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
          EmployeeMonitor.aggregate([
            { $match: monitorMatch },
            {
              $group: {
                _id: null,
                totalClicks: { $sum: "$mouseClicks" },
                totalKeyPresses: { $sum: "$keyPresses" },
                totalMovements: { $sum: "$mouseMovements" },
                totalActiveSeconds: { $sum: "$activeSeconds" },
                totalIdleSeconds: { $sum: "$idleSeconds" }
              }
            }
          ])
        ]);

        const totalPages = Math.ceil(totalRecords / (limit || 1));

        const summary = summaryAgg && summaryAgg.length > 0 ? summaryAgg[0] : {
            totalClicks: 0,
            totalKeyPresses: 0,
            totalMovements: 0,
            totalActiveSeconds: 0,
            totalIdleSeconds: 0
        };

        const averageDurationHours = totalRecords > 0 ? Number((summary.totalActiveSeconds / totalRecords / 3600).toFixed(2)) : 0;

        const results = monitorData.map(monitor => {
            const emp = employees.find((e: any) => e._id.toString() === monitor.userId.toString());
            if (!emp) return null;
            return {
                ...emp,
                _id: monitor._id,
                userId: emp._id,
                activity: monitor
            };
        }).filter(Boolean);

        return NextResponse.json({
            success: true,
            data: results,
            summary: {
                sessionsTracked: totalRecords,
                avgDurationHours: averageDurationHours,
                totalClicks: summary.totalClicks,
                totalKeyPresses: summary.totalKeyPresses,
                totalMovements: summary.totalMovements,
                totalActiveHours: Number((summary.totalActiveSeconds / 3600).toFixed(2)),
                totalIdleHours: Number((summary.totalIdleSeconds / 3600).toFixed(2))
            },
            pagination: {
                totalActiveRecords: totalRecords,
                totalPages,
                currentPage: page,
                limit
            }
        });
    } catch (error: any) {
        console.error("Error in Monitor API:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
