import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { Project } from "@/models/Project";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * API to retrieve monitor records where the status is "stop" 
 * and no project updates have been filled.
 * Grouped by date.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(errorResp("userId parameter is required"), { status: 400 });
        }

        await connectDB();

        // 1. Find all active/non-archived projects where this user is a member
        const assignedProjects = await Project.find({
            members: userId,
            status: { $ne: "archived" }
        }, "name _id").lean();

        const formattedAssignedProjects = assignedProjects.map(p => ({
            id: p._id.toString(),
            name: p.name
        }));

        // 2. Find monitor records where status is "stop" and no projects submitted
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

        // 3. Format according to requested response structure
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
