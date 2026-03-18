import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { successResp, errorResp } from "@/lib/apiResponse";
import { startOfMonth, endOfMonth, parseISO, isValid } from "date-fns";

export async function GET(request: Request) {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get("auth_token")?.value;
        const payload = token ? verifyAuthToken(token) : null;

        if (!payload || (payload.role !== "admin" && payload.role !== "hr" && payload.role !== "manager")) {
            return NextResponse.json(errorResp("Unauthorized"), { status: 403 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const month = searchParams.get("month"); // YYYY-MM
        const projectId = searchParams.get("projectId");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        const query: any = {};
        
        if (userId && userId !== "all") {
            query.userId = userId;
        }

        if (month) {
            const monthDate = parseISO(`${month}-01`);
            if (isValid(monthDate)) {
                const start = startOfMonth(monthDate);
                const end = endOfMonth(monthDate);
                // We use the 'date' string field in EmployeeMonitor: YYYY-MM-DD
                const startStr = monthDate.toISOString().split('T')[0].substring(0, 7);
                query.date = { $regex: `^${month}` }; 
            }
        }

        // Filter for records that have non-empty projects array
        query.projects = { $exists: true, $not: { $size: 0 } };

        if (projectId && projectId !== "all") {
            query["projects.projectId"] = projectId;
        }

        const [records, total] = await Promise.all([
            EmployeeMonitor.find(query)
                .sort({ date: -1, time: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            EmployeeMonitor.countDocuments(query)
        ]);

        // 2. Fetch User and Project data manually to enrich the records
        const uniqueUserIds = [...new Set(records.map((r: any) => r.userId))];
        const projectIds = [...new Set(records.flatMap((r: any) => (r.projects || []).map((p: any) => p.projectId)))];

        const [users, allProjectsData] = await Promise.all([
            User.find({ _id: { $in: uniqueUserIds } }, "firstName lastName avatarUrl").lean(),
            Project.find({ _id: { $in: projectIds } }, "name").lean()
        ]);

        const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
        const projectMap = new Map(allProjectsData.map((p: any) => [p._id.toString(), p.name]));

        const results = records.map((record: any) => {
            const userData: any = userMap.get(record.userId);
            return {
                _id: record._id.toString(),
                userId: record.userId,
                userName: userData ? `${userData.firstName} ${userData.lastName}` : "Unknown User",
                date: record.date,
                time: record.time,
                user: userData || null,
                projects: (record.projects || []).map((p: any) => ({
                    ...p,
                    projectName: projectMap.get(p.projectId) || "Unknown Project"
                }))
            };
        });

        return NextResponse.json(successResp("Project updates fetched", {
            updates: results,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        }));

    } catch (error: any) {
        console.error("Error in project-updates API:", error);
        return NextResponse.json(errorResp(error.message || "Internal Server Error"), { status: 500 });
    }
}
