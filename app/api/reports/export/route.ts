import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { User } from "@/models/User";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { parseISO, eachDayOfInterval, format } from "date-fns";
import ExcelJS from "exceljs";

// @ts-expect-error - json2csv doesn't have official types in some versions
import { Parser } from "json2csv";

export async function GET(request: Request) {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get("auth_token")?.value;
        const payload = token ? verifyAuthToken(token) : null;

        if (!payload || (payload.role !== "admin" && payload.role !== "hr")) {
            return new Response("Unauthorized", { status: 403 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const startDateStr = searchParams.get("startDate");
        const endDateStr = searchParams.get("endDate");
        const department = searchParams.get("department");
        const userId = searchParams.get("userId"); // Optional: for single employee export

        if (!startDateStr || !endDateStr) {
            return new Response("startDate and endDate are required", { status: 400 });
        }

        const start = parseISO(startDateStr);
        const end = parseISO(endDateStr);
        const days = eachDayOfInterval({ start, end });
        const dateStrings = days.map(d => format(d, "yyyy-MM-dd"));

        const userFilter: any = { isDeleted: false, isActive: true };
        if (userId && userId !== "all") {
            userFilter._id = userId;
        } else if (department && department !== "all") {
            userFilter.department = department;
        }

        const users = await User.find(userFilter).lean();
        const userIds = users.map((u: any) => u._id.toString());

        // Helper to parse time string HH:mm:ss to minutes
        const timeToMinutes = (timeStr: string | undefined): number => {
            if (!timeStr || typeof timeStr !== "string") return 0;
            const parts = timeStr.split(":").map(Number);
            if (parts.length < 2) return 0;
            const h = parts[0] || 0;
            const m = parts[1] || 0;
            const s = parts[2] || 0;
            return h * 60 + m + s / 60;
        };

        // Aggregate monitor data with precise logic (Session - Break)
        const monitorData = await EmployeeMonitor.aggregate([
            {
                $match: {
                    userId: { $in: userIds },
                    date: { $in: dateStrings }
                }
            },
            {
                $group: {
                    _id: { userId: "$userId", date: "$date" },
                    workSeconds: { $sum: "$activeSeconds" },
                    idleSeconds: { $sum: "$idleSeconds" },
                    maxBreak: { $max: "$breakTime" },
                    maxSession: { $max: "$sessionTime" }
                }
            }
        ]);

        const dataMap = new Map();
        monitorData.forEach(d => {
            const breakMs = timeToMinutes(d.maxBreak || "00:00:00") * 60000;
            const sessionMs = timeToMinutes(d.maxSession || "00:00:00") * 60000;

            let workMs = 0;
            if (sessionMs > 0) {
                workMs = Math.max(0, sessionMs - breakMs);
            } else {
                workMs = (d.workSeconds + (d.idleSeconds || 0)) * 1000;
            }

            dataMap.set(`${d._id.userId}_${d._id.date}`, workMs);
        });

        const formatDuration = (ms: number) => {
            return (ms / 3600000).toFixed(2); // Always return decimal for CSV compatibility
        };

        const data = users.map((user: any) => {
            const row: any = {
                Employee: `${user.firstName} ${user.lastName}`,
                Email: user.email,
                Department: user.department || "General",
            };

            let totalMs = 0;
            dateStrings.forEach(dStr => {
                const workMs = dataMap.get(`${user._id.toString()}_${dStr}`) || 0;
                totalMs += workMs;
                row[dStr] = formatDuration(workMs);
            });

            row["Total Hours"] = formatDuration(totalMs);
            return row;
        });

        // Forced CSV as per user request
        const fields = ["Employee", "Email", "Department", ...dateStrings, "Total Hours"];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);

        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename=timesheet_${startDateStr}_to_${endDateStr}.csv`,
            },
        });
    } catch (err: any) {
        console.error("[api/reports/export] error:", err);
        return new Response("Failed to export reports", { status: 500 });
    }
}
