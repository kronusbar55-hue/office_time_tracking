import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getTenantContext } from "@/lib/tenantContext";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * API to retrieve monitor records where the status is "stop" 
 * and no project updates have been filled.
 * Grouped by date.
 */
export async function GET(request: Request) {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get("auth_token")?.value;
        const payload = token ? verifyAuthToken(token) as any : null;

        if (!payload) {
            return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
        }

        const tenantContext = await getTenantContext();
        const effectiveTenantId = tenantContext.effectiveTenantId;
        if (!effectiveTenantId) {
            return NextResponse.json(errorResp("Tenant not found"), { status: 403 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(errorResp("userId parameter is required"), { status: 400 });
        }

        const user = await User.findOne({
            _id: userId,
            $or: [{ tenantId: effectiveTenantId }, { _id: effectiveTenantId }]
        }).lean();

        if (!user) {
            return NextResponse.json(errorResp("Unauthorized"), { status: 403 });
        }

        const assignedProjects = await Project.find({
            members: userId,
            status: { $ne: "archived" },
            tenantId: effectiveTenantId
        }, "name _id").lean();

        const formattedAssignedProjects = assignedProjects.map(p => ({
            id: p._id.toString(),
            name: p.name
        }));

        const pendingRecords = await EmployeeMonitor.find({
            userId,
            status: "stop",
            $or: [
                { projects: { $size: 0 } },
                { projects: { $exists: false } }
            ]
        })
        .sort({ date: -1, time: -1 })
        .lean();

        const pendingUpdates = pendingRecords.map((record: any) => ({
            date: record.date,
            _id: record._id.toString(),
            status: record.status,
            assignProjects: formattedAssignedProjects,
            project: record.projects || []
        }));

        return NextResponse.json({
            success: true,
            message: "Pending project updates fetched",
            data: {
                userId,
                count: pendingRecords.length,
                pendingUpdates
            },
            allProject: formattedAssignedProjects
        });

    } catch (error: any) {
        console.error("Error in pending-updates API:", error);
        return NextResponse.json(errorResp(error.message || "Internal Server Error"), { status: 500 });
    }
}
