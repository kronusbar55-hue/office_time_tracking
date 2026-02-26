import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { AttendanceLog } from "@/models/AttendanceLog";
import { User } from "@/models/User";
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
        const formatType = searchParams.get("format") || "csv"; // csv or xls
        const durationFormat = searchParams.get("durationFormat") || "hhmm"; // hhmm or decimal

        if (!startDateStr || !endDateStr) {
            return new Response("startDate and endDate are required", { status: 400 });
        }

        const start = parseISO(startDateStr);
        const end = parseISO(endDateStr);
        const days = eachDayOfInterval({ start, end });

        const userFilter: any = { isDeleted: false, isActive: true };
        if (department && department !== "all") userFilter.department = department;

        const users = await User.find(userFilter).lean();
        const userIds = users.map(u => u._id);

        const logs = await AttendanceLog.find({
            userId: { $in: userIds },
            date: { $gte: startDateStr, $lte: endDateStr }
        }).lean();

        const formatDuration = (ms: number) => {
            if (durationFormat === "decimal") return (ms / 3600000).toFixed(2);
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            return `${h}h ${m}m`;
        };

        const data = users.map((user: any) => {
            const row: any = {
                Employee: `${user.firstName} ${user.lastName}`,
                Email: user.email,
                Department: user.department || "General",
            };

            let totalMs = 0;
            days.forEach(day => {
                const dStr = format(day, "yyyy-MM-dd");
                const log = logs.find(l => l.userId.toString() === user._id.toString() && l.date === dStr);
                const workMs = log?.totalWorkMs || 0;
                totalMs += workMs;
                row[dStr] = formatDuration(workMs);
            });

            row["Total Hours"] = formatDuration(totalMs);
            return row;
        });

        if (formatType === "csv") {
            const fields = ["Employee", "Email", "Department", ...days.map(d => format(d, "yyyy-MM-dd")), "Total Hours"];
            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(data);

            return new Response(csv, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename=timesheet_${startDateStr}_${endDateStr}.csv`,
                },
            });
        } else {
            // Excel logic
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Timesheet");

            const columns = [
                { header: "Employee", key: "Employee", width: 20 },
                { header: "Email", key: "Email", width: 25 },
                { header: "Department", key: "Department", width: 15 },
                ...days.map(d => ({ header: format(d, "yyyy-MM-dd"), key: format(d, "yyyy-MM-dd"), width: 12 })),
                { header: "Total Hours", key: "Total Hours", width: 15 }
            ];

            worksheet.columns = columns;
            worksheet.addRows(data);

            // Styling
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

            const buffer = await workbook.xlsx.writeBuffer();
            return new Response(buffer, {
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": `attachment; filename=timesheet_${startDateStr}_${endDateStr}.xlsx`,
                },
            });
        }
    } catch (err: any) {
        console.error("[api/reports/export] error:", err);
        return new Response("Failed to export reports", { status: 500 });
    }
}
