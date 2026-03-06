import { EmployeeMonitor } from "@/models/EmployeeMonitor";

/**
 * Utility to parse HH:mm:ss string to total minutes
 */
export function timeToMinutes(timeStr: string | undefined): number {
    if (!timeStr || typeof timeStr !== "string") return 0;
    const parts = timeStr.split(":").map(Number);
    if (parts.length < 2) return 0;

    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts[2] || 0;

    return h * 60 + m + s / 60;
}

/**
 * Aggregates monitor metrics for a user over a date range
 */
export async function getMonitorStats(userId: string, startDate: Date, endDate: Date) {
    // Generate date strings for the range (YYYY-MM-DD)
    const dates: string[] = [];
    let curr = new Date(startDate);
    while (curr <= endDate) {
        dates.push(curr.toISOString().split("T")[0]);
        curr.setDate(curr.getDate() + 1);
    }

    // Aggregate active seconds per day
    const activeAgg = await EmployeeMonitor.aggregate([
        {
            $match: {
                userId: userId,
                date: { $in: dates }
            }
        },
        {
            $group: {
                _id: "$date",
                totalActiveSeconds: { $sum: "$activeSeconds" },
                maxBreakTime: { $max: "$breakTime" },
                maxSessionTime: { $max: "$sessionTime" }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    return activeAgg.map(item => ({
        date: item._id,
        workedMinutes: Math.round(item.totalActiveSeconds / 60),
        breakMinutes: Math.round(timeToMinutes(item.maxBreakTime)),
        sessionMinutes: Math.round(timeToMinutes(item.maxSessionTime))
    }));
}

/**
 * Gets stats for a single day
 */
export async function getDayMonitorStats(userId: string, dateStr: string) {
    const records = await EmployeeMonitor.find({ userId, date: dateStr })
        .sort({ createdAt: -1 })
        .limit(1)
        .lean();

    if (records.length === 0) return { workedMinutes: 0, breakMinutes: 0, sessionMinutes: 0 };

    const latest = records[0];

    // For worked minutes, we still want the sum of activeSeconds for the whole day
    const sumResult = await EmployeeMonitor.aggregate([
        { $match: { userId, date: dateStr } },
        { $group: { _id: null, total: { $sum: "$activeSeconds" } } }
    ]);

    const totalActiveSeconds = sumResult[0]?.total || 0;

    return {
        workedMinutes: Math.round(totalActiveSeconds / 60),
        breakMinutes: Math.round(timeToMinutes(latest.breakTime)),
        sessionMinutes: Math.round(timeToMinutes(latest.sessionTime))
    };
}
