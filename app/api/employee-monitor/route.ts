import { NextResponse } from "next/server"
import { EmployeeMonitor } from "@/models/EmployeeMonitor"
import { connectDB } from "@/lib/db"

export async function POST(req: Request) {
    try {
        await connectDB()
        const body = await req.json()
        let {
            userId,
            imageUrl,
            date,
            time,
            intervalStart,
            intervalEnd,
            mouseClicks,
            mouseMovements,
            keyPresses,
            activeSeconds,
            timezone,
            status,
            sessionTime,
            breakTime,
            meetingTime,
            appUsage,
            projects
        } = body

        // Sanitize appUsage keys to prevent Mongoose errors (keys containing '.' or '$')
        let sanitizedAppUsage = appUsage;
        if (appUsage && typeof appUsage === 'object') {
            sanitizedAppUsage = {};
            for (const [key, value] of Object.entries(appUsage)) {
                const sanitizedKey = key.replace(/[\.\$]/g, '_');
                sanitizedAppUsage[sanitizedKey] = value;
            }
        }

        if (!userId || !imageUrl || !date || !time) {
            return NextResponse.json(
                { success: false, message: "Missing required fields: userId, imageUrl, date, time" },
                { status: 400 }
            )
        }

        let monitorEntry;

        if (status === "stop") {
            // Find existing stop entry for the same day and user to update it (one-time checkout)
            monitorEntry = await EmployeeMonitor.findOneAndUpdate(
                { userId, date, status: "stop" },
                {
                    imageUrl,
                    time,
                    intervalStart,
                    intervalEnd,
                    mouseClicks,
                    mouseMovements,
                    keyPresses,
                    activeSeconds,
                    timezone,
                    status,
                    sessionTime,
                    breakTime,
                    meetingTime,
                    appUsage: sanitizedAppUsage,
                    projects
                },
                { new: true, upsert: true }
            );
        } else {
            monitorEntry = await EmployeeMonitor.create({
                userId,
                imageUrl,
                date,
                time,
                intervalStart,
                intervalEnd,
                mouseClicks,
                mouseMovements,
                keyPresses,
                activeSeconds,
                timezone,
                status,
                sessionTime,
                breakTime,
                meetingTime,
                appUsage: sanitizedAppUsage,
                projects
            });
        }

        return NextResponse.json(
            { success: true, data: monitorEntry },
            { status: 201 }
        )
    } catch (error: any) {
        console.error("Error in employee-monitor API:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        )
    }
}
