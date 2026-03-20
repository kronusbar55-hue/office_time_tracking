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
    // Generate list of dates to process
    const dates: string[] = [];
    let curr = new Date(startDate);
    while (curr <= endDate) {
        dates.push(curr.toISOString().split("T")[0]);
        curr.setDate(curr.getDate() + 1);
    }

    const results = [];

    for (const date of dates) {
        // Find first and last record for this date
        const records = await EmployeeMonitor.find({ userId, date })
            .sort({ time: 1 })
            .lean();

        if (records.length === 0) {
            results.push({
                date,
                workedMinutes: 0,
                breakMinutes: 0,
                sessionMinutes: 0
            });
            continue;
        }

        const first = records[0];
        const last = records[records.length - 1];

        const startMins = timeToMinutes(first.time);
        const endMins = timeToMinutes(last.time);
        const breakMins = timeToMinutes(last.breakTime || "00:00:00");

        // The logic: (last record time - first record time) - total break time
        // This gives the total worked minutes between start and end
        const trackedMins = (records.reduce((acc, r) => acc + (r.activeSeconds || 0) + (r.idleSeconds || 0), 0)) / 60;
        let workedMins = Math.max(0, endMins - startMins - breakMins);

        // Fallback: If tracked activity minutes are greater than the session-based calculation
        if (trackedMins > workedMins) {
            workedMins = trackedMins;
        }

        results.push({
            date,
            workedMinutes: Math.round(workedMins),
            breakMinutes: Math.round(breakMins),
            sessionMinutes: Math.round(endMins - startMins)
        });
    }

    return results;
}

/**
 * Gets stats for a single day
 */
export async function getDayMonitorStats(userId: string, dateStr: string) {
    const records = await EmployeeMonitor.find({ userId, date: dateStr })
        .sort({ time: 1 })
        .lean();

    if (records.length === 0) {
        return { workedMinutes: 0, breakMinutes: 0, sessionMinutes: 0, isActive: false, lastActivityAt: null };
    }

    const first = records[0];
    const last = records[records.length - 1];

    const startMins = timeToMinutes(first.time);
    const endMins = timeToMinutes(last.time);
    const breakMins = timeToMinutes(last.breakTime || "00:00:00");

    const trackedMinutes = (records.reduce((acc, r) => acc + (r.activeSeconds || 0) + (r.idleSeconds || 0), 0)) / 60;
    let workedMinutes = Math.max(0, endMins - startMins - breakMins);

    // Use trackedMinutes if it's more accurate than session-break calculation
    if (trackedMinutes > workedMinutes) {
        workedMinutes = trackedMinutes;
    }

    // Check if user is currently active (last record within 15 minutes and status not OFFLINE/CHECKED_OUT)
    const lastCreatedAt = new Date(last.createdAt).getTime();
    const now = Date.now();
    const isRecent = (now - lastCreatedAt) < 15 * 60 * 1000;
    const status = (last.status || "").toUpperCase();
    const isActive = isRecent && status !== "OFFLINE" && status !== "CHECKED_OUT";

    return {
        workedMinutes: Math.round(workedMinutes),
        breakMinutes: Math.round(breakMins),
        sessionMinutes: Math.round(endMins - startMins),
        isActive,
        lastActivityAt: last.createdAt,
        status: last.status
    };
}
