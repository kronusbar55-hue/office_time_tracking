import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const dateParam = searchParams.get("date"); // YYYY-MM-DD
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "12");

        // Fetch all active employees (optionally filtered by userId)
        const employeeQuery: any = { isDeleted: false };
        if (userId && userId !== "all") {
            employeeQuery._id = userId;
        }
        const employees = await User.find(employeeQuery, "firstName lastName avatarUrl").lean();

        // Build Monitor match query
        const monitorMatch: any = {};
        if (userId && userId !== "all") {
            monitorMatch.userId = userId;
        }
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
