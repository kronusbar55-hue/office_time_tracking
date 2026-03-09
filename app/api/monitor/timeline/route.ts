import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get("auth_token")?.value;
        const payload = token ? verifyAuthToken(token) as any : null;

        if (!payload || (payload.role !== "admin" && payload.role !== "hr" && payload.role !== "manager" && payload.role !== "employee")) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        let userId = searchParams.get("userId");
        const date = searchParams.get("date");

        // Enforce "own data only" for employees
        if (payload.role === "employee") {
            userId = payload.sub;
        }

        if (!userId || !date) {
            return NextResponse.json({ success: false, message: "userId and date are required" }, { status: 400 });
        }

        const timelineData = await EmployeeMonitor.find({ userId, date })
            .sort({ createdAt: 1 })
            .select("status activeSeconds idleSeconds mouseClicks keyPresses breakTime sessionTime createdAt")
            .lean();

        // Process data into segments
        const segments = timelineData.map((item: any, index: number) => {
            return {
                status: item.status || "Active",
                time: item.createdAt,
                stats: {
                    clicks: item.mouseClicks,
                    keys: item.keyPresses,
                    active: item.activeSeconds,
                    idle: item.idleSeconds
                },
                breakTime: item.breakTime,
                sessionTime: item.sessionTime
            };
        });

        return NextResponse.json({
            success: true,
            data: segments
        });
    } catch (error: any) {
        console.error("Error in Monitor Timeline API:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
