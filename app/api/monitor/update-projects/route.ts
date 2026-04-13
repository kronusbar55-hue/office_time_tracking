import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { User } from "@/models/User";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getTenantContext } from "@/lib/tenantContext";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * API to update the project updates for a specific monitor record.
 * Typically used when status is "stop" and user missed filling project details.
 */
export async function POST(request: Request) {
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
        
        const body = await request.json();
        const { _id, userId, projects } = body;

        if (!_id) {
            return NextResponse.json(errorResp("_id is required to update"), { status: 400 });
        }

        if (!projects || !Array.isArray(projects)) {
            return NextResponse.json(errorResp("projects must be an array"), { status: 400 });
        }

        const record: any = await EmployeeMonitor.findById(_id).lean();
        if (!record) {
            return NextResponse.json(errorResp("Monitor record not found"), { status: 404 });
        }

        if (payload.role !== "admin" && record.userId !== payload.sub) {
            return NextResponse.json(errorResp("Unauthorized"), { status: 403 });
        }

        if (payload.role === "admin") {
            const user = await User.findOne({
                _id: record.userId,
                $or: [{ tenantId: effectiveTenantId }, { _id: effectiveTenantId }]
            }).lean();
            if (!user) {
                return NextResponse.json(errorResp("Unauthorized"), { status: 403 });
            }
        }

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
