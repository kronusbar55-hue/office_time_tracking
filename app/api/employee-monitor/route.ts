import { NextResponse } from "next/server"
import { EmployeeMonitor } from "@/models/EmployeeMonitor"
import { connectDB } from "@/lib/db"

export async function POST(req: Request) {
    try {
        await connectDB()
        const body = await req.json()
        const {
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
            idleSeconds,
            timezone
        } = body

        if (!userId || !imageUrl || !date || !time) {
            return NextResponse.json(
                { success: false, message: "Missing required fields: userId, imageUrl, date, time" },
                { status: 400 }
            )
        }

        const newMonitorEntry = await EmployeeMonitor.create({
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
            idleSeconds,
            timezone
        })

        return NextResponse.json(
            { success: true, data: newMonitorEntry },
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
