import cron from "node-cron";
import { connectDB } from "./db";
import { User } from "@/models/User";
import { CheckInOut } from "@/models/CheckInOut";
import { TimeSession } from "@/models/TimeSession"; // To find stuck sessions
import { Shift, type IShift } from "@/models/Shift";
import { EmployeeShift } from "@/models/EmployeeShift";

let isSchedulerRunning = false;

export async function aggregateSessionIntoDailyRecord(session: any) {
    const user = await User.findById(session.user).lean();
    if (!user) {
        console.warn(`[Scheduler] Skipping aggregation, user not found for session ${session._id}`);
        return;
    }

    // Resolve shift (employee-specific or default)
    let shift: IShift | null = null;
    const empShift = await EmployeeShift.findOne({
        user: session.user,
        isActive: true
    })
        .populate("shift")
        .lean();

    if (empShift && (empShift as any).shift) {
        shift = (empShift as any).shift as IShift;
    } else {
        shift = (await Shift.findOne({ isDefault: true, isActive: true }).lean()) as IShift | null;
    }

    const shiftStartHour = shift ? parseInt(shift.startTime.split(":")[0] || "0", 10) : 9;
    const shiftStartMin = shift ? parseInt(shift.startTime.split(":")[1] || "0", 10) : 0;

    let shiftDurationMinutes = 540; // Default 9 hours
    if (shift) {
        const start =
            parseInt(shift.startTime.split(":")[0] || "0", 10) * 60 +
            parseInt(shift.startTime.split(":")[1] || "0", 10);
        const end =
            parseInt(shift.endTime.split(":")[0] || "0", 10) * 60 +
            parseInt(shift.endTime.split(":")[1] || "0", 10);
        let duration = end - start;
        if (duration < 0) duration += 1440;
        shiftDurationMinutes = duration;
    }

    const clockIn = new Date(session.clockIn);
    const clockOut = new Date(session.clockOut);

    const sessionWork =
        typeof session.totalWorkMinutes === "number"
            ? session.totalWorkMinutes
            : Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000) -
              (session.totalBreakMinutes || 0);
    const sessionBreak = session.totalBreakMinutes || 0;

    let record = await CheckInOut.findOne({
        user: session.user,
        date: session.date
    });

    if (!record) {
        record = new CheckInOut({
            user: session.user,
            userRole: user.role,
            date: session.date,
            shift: shift ? shift._id : undefined,
            sessions: [],
            workMinutes: 0,
            breakMinutes: 0,
            status: "Present",
            attendancePercentage: 0
        });
    }

    record.sessions.push({
        clockIn,
        clockOut,
        duration: sessionWork,
        location: (session as any).location,
        deviceType: (session as any).deviceType || "web",
        notes: (session as any).notes
    });

    record.breakMinutes = (record.breakMinutes || 0) + sessionBreak;

    let totalNetWork = 0;
    record.sessions.forEach((s: any) => {
        totalNetWork += s.duration;
    });
    record.workMinutes = totalNetWork;

    const expectedWork =
        shiftDurationMinutes - (shift ? shift.breakDuration : 60);

    if (record.sessions.length > 0) {
        const firstClockIn = new Date(record.sessions[0].clockIn);
        const lateThreshold = new Date(firstClockIn);
        lateThreshold.setHours(
            shiftStartHour,
            shiftStartMin + (shift ? shift.gracePeriod : 15),
            0,
            0
        );
        if (firstClockIn > lateThreshold) {
            record.isLateCheckIn = true;
        }
    }

    if (expectedWork > 0 && record.workMinutes < expectedWork) {
        record.isEarlyCheckOut = true;
    } else {
        record.isEarlyCheckOut = false;
    }

    if (record.workMinutes > shiftDurationMinutes) {
        record.isOvertime = true;
        record.overtimeMinutes = record.workMinutes - shiftDurationMinutes;
    } else {
        record.isOvertime = false;
        record.overtimeMinutes = 0;
    }

    record.attendancePercentage =
        expectedWork > 0
            ? Math.min(
                  100,
                  Math.round((record.workMinutes / expectedWork) * 100)
              )
            : 0;

    if (record.attendancePercentage >= 90) record.status = "Present";
    else if (record.attendancePercentage >= 45) record.status = "Half-Day";
    else record.status = "Absent";

    await record.save();
}

export function initScheduler() {
    if (isSchedulerRunning) return;

    console.log("Initializing Scheduler...");

    // Job 1: Auto-Absent Mark at 12:00 PM
    // Runs every day at 12:00 PM
    cron.schedule("0 12 * * *", async () => {
        console.log("[Scheduler] Running Auto-Absent Job");
        try {
            await connectDB();
            const today = new Date().toISOString().split("T")[0];

            // Find all active employees
            const employees = await User.find({
                role: { $in: ["employee", "manager"] },
                isActive: true,
                isDeleted: false
            });

            for (const emp of employees) {
                // Check if they have a CheckInOut record for today
                const hasRecord = await CheckInOut.exists({
                    user: emp._id,
                    date: today
                });

                if (!hasRecord) {
                    // Check if they are on APPROVED leave (Need Leave model, skipping for now as per scope)
                    // Create Absent Record
                    await CheckInOut.create({
                        user: emp._id,
                        userRole: emp.role,
                        date: today,
                        status: "Absent",
                        sessions: [],
                        workMinutes: 0,
                        breakMinutes: 0,
                        notes: "Auto-marked as Absent by System"
                    });
                    console.log(
                        `[Scheduler] Marked user ${emp.email} as Absent`
                    );
                }
            }
        } catch (e) {
            console.error("[Scheduler] Auto-Absent Job Failed:", e);
        }
    });

    // Job 2: Auto-Close Stuck Sessions at 11:59 PM
    cron.schedule("59 23 * * *", async () => {
        console.log("[Scheduler] Running Auto-Close Sessions Job");
        try {
            await connectDB();
            const today = new Date().toISOString().split("T")[0];

            // Find active sessions that are stuck (no clockOut)
            const stuckSessions = await TimeSession.find({
                status: "active",
                clockOut: null,
                date: { $lte: today } // Include past days if any
            });

            for (const session of stuckSessions) {
                // Auto close them at 23:59:59 of their respective date
                const sessionDate = new Date(session.date);
                sessionDate.setHours(23, 59, 59, 999);

                session.clockOut = sessionDate;
                session.status = "completed";
                session.notes =
                    (session.notes || "") + " [Auto-closed by System]";

                // Calculate duration
                const start = new Date(session.clockIn);
                const duration = Math.floor(
                    (sessionDate.getTime() - start.getTime()) / 60000
                );
                session.totalWorkMinutes =
                    duration - (session.totalBreakMinutes || 0);

                await session.save();

                // After closing the session, aggregate it into the daily CheckInOut record
                await aggregateSessionIntoDailyRecord(session);

                console.log(
                    `[Scheduler] Auto-closed session for user ${session.user}`
                );
            }
        } catch (e) {
            console.error("[Scheduler] Auto-Close Job Failed:", e);
        }
    });

    isSchedulerRunning = true;
    console.log("Scheduler initialized.");
}
