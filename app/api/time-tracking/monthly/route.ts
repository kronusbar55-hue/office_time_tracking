import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { TimeSession } from "@/models/TimeSession";
import { TimeSessionBreak } from "@/models/TimeSessionBreak";
import { format, startOfMonth, endOfMonth, addDays, getDate } from "date-fns";
import mongoose from "mongoose";

export async function GET() {
  try {
    await connectDB();
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = new mongoose.Types.ObjectId(payload.sub);
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const sessions = await TimeSession.find({
      user: userId,
      clockIn: { $gte: monthStart, $lte: monthEnd }
    }).lean();

    const daysInMonth = getDate(monthEnd);
    const dayMap = new Map<number, number>();
    for (let d = 1; d <= daysInMonth; d++) {
      dayMap.set(d, 0);
    }

    const sessionIds = sessions.map((s: any) => s._id);
    const breaks = sessionIds.length
      ? await TimeSessionBreak.find({ timeSession: { $in: sessionIds } }).lean()
      : [];

    sessions.forEach((s: any) => {
      const dateStr = format(new Date(s.clockIn), "yyyy-MM-dd");
      const dayOfMonth = getDate(new Date(dateStr));
      const entry = dayMap.get(dayOfMonth);
      if (entry === undefined) return;
      const clockIn = new Date(s.clockIn).getTime();
      const clockOut = s.clockOut ? new Date(s.clockOut).getTime() : Date.now();
      const rawHours = (clockOut - clockIn) / 3600000;
      dayMap.set(dayOfMonth, (dayMap.get(dayOfMonth) || 0) + rawHours);
    });

    breaks.forEach((b: any) => {
      if (b.breakStart && b.breakEnd) {
        const session = sessions.find((s: any) => s._id.toString() === (b as any).timeSession?.toString());
        if (session) {
          const dateStr = format(new Date(session.clockIn), "yyyy-MM-dd");
          const dayOfMonth = getDate(new Date(dateStr));
          const dur = (new Date(b.breakEnd).getTime() - new Date(b.breakStart).getTime()) / 3600000;
          const current = dayMap.get(dayOfMonth) || 0;
          dayMap.set(dayOfMonth, Math.max(0, current - dur));
        }
      }
    });

    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      data.push({
        date: d,
        workedHours: Math.round((dayMap.get(d) || 0) * 100) / 100
      });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("[time-tracking/monthly]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
