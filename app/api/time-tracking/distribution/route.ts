import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { TimeSession } from "@/models/TimeSession";
import { TimeSessionBreak } from "@/models/TimeSessionBreak";
import { startOfWeek, addDays, startOfMonth, endOfMonth } from "date-fns";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    await connectDB();
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = new mongoose.Types.ObjectId(payload.sub);
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "week";

    let startDate: Date;
    let endDate: Date;

    if (range === "today") {
      const today = new Date();
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    } else if (range === "week") {
      startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      endDate = addDays(startDate, 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
    }

    const sessions = await TimeSession.find({
      user: userId,
      clockIn: { $gte: startDate, $lte: endDate }
    }).lean();

    let totalWorkedMinutes = 0;
    let totalBreakMinutes = 0;
    const sessionIds = sessions.map((s: any) => s._id);

    const allBreaks = sessionIds.length
      ? await TimeSessionBreak.find({ timeSession: { $in: sessionIds } }).lean()
      : [];

    sessions.forEach((s: any) => {
      const clockIn = new Date(s.clockIn).getTime();
      const clockOut = s.clockOut ? new Date(s.clockOut).getTime() : Date.now();
      totalWorkedMinutes += (clockOut - clockIn) / 60000;
    });

    allBreaks.forEach((b: any) => {
      if (b.breakStart && b.breakEnd) {
        totalBreakMinutes += (new Date(b.breakEnd).getTime() - new Date(b.breakStart).getTime()) / 60000;
      }
    });

    const workedMinutes = Math.round(totalWorkedMinutes - totalBreakMinutes);
    const breakMinutes = Math.round(totalBreakMinutes);
    const standardMinutes = range === "today" ? 8 * 60 : range === "week" ? 40 * 60 : 160 * 60;
    const overtimeMinutes = Math.max(0, workedMinutes - standardMinutes);

    return NextResponse.json({
      workedHours: Math.round((workedMinutes / 60) * 100) / 100,
      breakHours: Math.round((breakMinutes / 60) * 100) / 100,
      overtimeHours: Math.round((overtimeMinutes / 60) * 100) / 100,
      workedMinutes,
      breakMinutes,
      overtimeMinutes
    });
  } catch (e) {
    console.error("[time-tracking/distribution]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
