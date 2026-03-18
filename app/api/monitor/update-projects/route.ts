import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * API to update the project updates for a specific monitor record.
 * Typically used when status is "stop" and user missed filling project details.
 */
export async function POST(request: Request) {
    try {
        await connectDB();
        
        const body = await request.json();
        const { _id, userId, projects } = body;

        if (!_id) {
            return NextResponse.json(errorResp("_id is required to update"), { status: 400 });
        }

        if (!projects || !Array.isArray(projects)) {
            return NextResponse.json(errorResp("projects must be an array"), { status: 400 });
        }

        // Find and update the record
        // We also check userId for extra security if provided
        const query: any = { _id };
        if (userId) query.userId = userId;

        const updatedRecord = await EmployeeMonitor.findOneAndUpdate(
            query,
            { 
                $set: { projects: projects } 
            },
            { new: true } // Return the updated document
        ).lean();

        if (!updatedRecord) {
            return NextResponse.json(errorResp("Monitor record not found or permission denied"), { status: 404 });
        }

        return NextResponse.json(successResp("Project updates saved successfully", {
            record: updatedRecord
        }));

    } catch (error: any) {
        console.error("Error in update-projects API:", error);
        return NextResponse.json(errorResp(error.message || "Internal Server Error"), { status: 500 });
    }
}
