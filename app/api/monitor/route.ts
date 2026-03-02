import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { User } from "@/models/User";

export async function GET() {
    try {
        await connectDB();

        // Fetch all active employees
        const employees = await User.find({ isDeleted: false }, "firstName lastName avatarUrl").lean();

        // Fetch the latest monitor entry for each employee
        const monitorData = await EmployeeMonitor.aggregate([
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: "$userId",
                    latestEntry: { $first: "$$ROOT" }
                }
            }
        ]);

        // Merge employee info with monitor data
        const results = employees.map(emp => {
            const monitor = monitorData.find(m => m._id === emp._id.toString() || m._id === emp.userId);
            return {
                ...emp,
                activity: monitor ? monitor.latestEntry : null
            };
        });

        return NextResponse.json({ success: true, data: results });
    } catch (error: any) {
        console.error("Error in Monitor API:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
