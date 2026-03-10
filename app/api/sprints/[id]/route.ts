import { NextResponse } from "next/server";
import { SprintService } from "@/services/sprint.service";
import { connectDB } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get("auth_token")?.value;
        const payload = token ? (verifyAuthToken(token) as any) : null;

        if (!payload || (payload.role !== "admin" && payload.role !== "manager")) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const { action, startDate, endDate } = body;

        let result;
        if (action === "START") {
            result = await SprintService.startSprint(params.id, new Date(startDate), new Date(endDate));
        } else if (action === "COMPLETE") {
            result = await SprintService.completeSprint(params.id);
        } else {
            return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
