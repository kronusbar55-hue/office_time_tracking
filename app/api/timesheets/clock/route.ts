import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TimeEntry } from "@/models/TimeEntry";
import { startOfDay, endOfDay } from "date-fns";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function POST(request: Request) {
  try {
    await connectDB();

    const { action, date, projectAllocations, notes } = await request.json().catch(() => ({}));

    // Authenticate user
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    const userId = payload.sub;

    console.log("[timesheets/clock] user:", userId, "action:", action);

    if (action === "clock-in") {
      const activeSession = await TimeEntry.findOne({ user: userId, clockOut: null });
      if (activeSession) return NextResponse.json(errorResp("Already clocked in"), { status: 400 });

      const entry = new TimeEntry({ user: userId, clockIn: new Date(), breaks: [], trackedMinutes: 0 });
      await entry.save();
      return NextResponse.json(successResp("Clocked in", { entry }));
    }

    if (action === "clock-out") {
      const activeSession = await TimeEntry.findOne({ user: userId, clockOut: null });
      if (!activeSession) return NextResponse.json(errorResp("No active session"), { status: 400 });

      const clockOutTime = new Date();
      const clockInTime = new Date(activeSession.clockIn);
      const totalMinutes = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60);

      let breakMinutes = 0;
      (activeSession.breaks || []).forEach((breakItem: any) => {
        if (breakItem.endTime) {
          const breakStart = new Date(breakItem.startTime);
          const breakEnd = new Date(breakItem.endTime);
          breakMinutes += (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
        }
      });

      if (projectAllocations && projectAllocations.length > 0) {
        const totalHours = projectAllocations.reduce((sum: number, pa: any) => sum + pa.hours, 0);
        const trackedHours = (totalMinutes - breakMinutes) / 60;
        if (Math.abs(totalHours - trackedHours) > 0.1) return NextResponse.json(errorResp(`Project hours (${totalHours.toFixed(2)}h) must equal tracked hours (${trackedHours.toFixed(2)}h)`), { status: 400 });
      }

      activeSession.clockOut = clockOutTime;
      activeSession.trackedMinutes = totalMinutes - breakMinutes;
      if (projectAllocations) activeSession.projectAllocations = projectAllocations;
      if (notes) activeSession.notes = notes;

      await activeSession.save();
      return NextResponse.json(successResp("Clocked out", { entry: activeSession }));
    }

    if (action === "start-break") {
      const activeSession = await TimeEntry.findOne({ user: userId, clockOut: null });
      if (!activeSession) return NextResponse.json(errorResp("No active session"), { status: 400 });

      const activeBreak = activeSession.breaks?.find((b: any) => !b.endTime);
      if (activeBreak) return NextResponse.json(errorResp("Break already in progress"), { status: 400 });

      activeSession.breaks?.push({ startTime: new Date(), endTime: null });
      await activeSession.save();
      return NextResponse.json(successResp("Break started", { entry: activeSession }));
    }

    if (action === "end-break") {
      const activeSession = await TimeEntry.findOne({ user: userId, clockOut: null });
      if (!activeSession) return NextResponse.json(errorResp("No active session"), { status: 400 });

      const activeBreak = activeSession.breaks?.find((b: any) => !b.endTime);
      if (!activeBreak) return NextResponse.json(errorResp("No active break"), { status: 400 });

      activeBreak.endTime = new Date();
      await activeSession.save();
      return NextResponse.json(successResp("Break ended", { entry: activeSession }));
    }

    return NextResponse.json(errorResp("Invalid action"), { status: 400 });
  } catch (error: any) {
    console.error("Clock in/out error:", error);
    return NextResponse.json(errorResp("Failed to process clock action", error?.message || error), { status: 500 });
  }
}
