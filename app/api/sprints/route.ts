import { NextResponse } from "next/server";
import { SprintService } from "@/services/sprint.service";
import { connectDB } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { SprintSchema } from "@/lib/validators/kanban";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");

        if (!projectId) {
            return NextResponse.json({ success: false, message: "Project ID is required" }, { status: 400 });
        }

        await connectDB();
        const sprints = await SprintService.getSprints(projectId);
        return NextResponse.json({ success: true, data: sprints });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get("auth_token")?.value;
        const payload = token ? (verifyAuthToken(token) as any) : null;

        if (!payload || (payload.role !== "admin" && payload.role !== "manager")) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const validated = SprintSchema.parse(body);

        const sprint = await SprintService.createSprint(validated.projectId, validated.name, validated.goal);

        return NextResponse.json({ success: true, data: sprint });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
