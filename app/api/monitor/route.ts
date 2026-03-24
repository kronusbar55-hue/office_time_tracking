import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { User } from "@/models/User";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";

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

        await connectDB();

        const { searchParams } = new URL(req.url);
        let userId = searchParams.get("userId");
        const dateParam = searchParams.get("date"); // YYYY-MM-DD
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "12");

        // Enforce "login user only" for non-admin roles (including HR)
        if (payload.role !== "admin") {
            userId = payload.sub;
        }

        // Requirement: API only works with selected employee
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

        // Fetch the specific employee
        const employees = await User.find({ _id: userId, isDeleted: false }, "firstName lastName avatarUrl").lean();

        if (employees.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Build Monitor match query
        const monitorMatch: any = { userId: userId };
        if (dateParam) {
            monitorMatch.date = dateParam;
        }

        const totalRecords = await EmployeeMonitor.countDocuments(monitorMatch);
        const totalPages = Math.ceil(totalRecords / limit);
        const skip = (page - 1) * limit;

        const monitorData = await EmployeeMonitor.find(monitorMatch)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Merge employee info with monitor data to return one object per record
        const results = monitorData.map(monitor => {
            const emp = employees.find((e: any) => e._id.toString() === monitor.userId.toString());
            if (!emp) return null;
            return {
                ...emp,
                _id: monitor._id, // Use monitor ID as key for distinct grid components
                userId: emp._id,
                activity: monitor
            };
        }).filter(Boolean);

        return NextResponse.json({
            success: true,
            data: results,
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
