import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { TimeSession } from "@/models/TimeSession";
import { TimeSessionBreak } from "@/models/TimeSessionBreak";
import { format, startOfWeek, addDays, endOfDay } from "date-fns";
import mongoose from "mongoose";

export async function GET() {
  try {
    await connectDB();
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = new mongoose.Types.ObjectId(payload.sub);
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfDay(addDays(weekStart, 6));

    const sessions = await TimeSession.find({
      user: userId,
      clockIn: { $gte: weekStart, $lte: weekEnd }
    }).lean();

    // Zero-fill all 7 days
    const dayMap = new Map<string, { work: number; break: number }>();
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      dayMap.set(format(d, "yyyy-MM-dd"), { work: 0, break: 0 });
    }

    const sessionIds = sessions.map((s: any) => s._id);
    const breaks = sessionIds.length
      ? await TimeSessionBreak.find({ timeSession: { $in: sessionIds } }).lean()
      : [];

    sessions.forEach((s: any) => {
      const dateStr = format(new Date(s.clockIn), "yyyy-MM-dd");
      const entry = dayMap.get(dateStr);
      if (!entry) return;
      const clockIn = new Date(s.clockIn).getTime();
      const clockOut = s.clockOut ? new Date(s.clockOut).getTime() : Date.now();
      entry.work += (clockOut - clockIn) / 3600000;
    });

    breaks.forEach((b: any) => {
      if (b.breakStart && b.breakEnd) {
        const session = sessions.find((s: any) => s._id.toString() === (b as any).timeSession?.toString());
        if (session) {
          const dateStr = format(new Date(session.clockIn), "yyyy-MM-dd");
          const entry = dayMap.get(dateStr);
          if (entry) {
            const dur = (new Date(b.breakEnd).getTime() - new Date(b.breakStart).getTime()) / 3600000;
            entry.break += dur;
            entry.work -= dur;
          }
        }
      }
    });

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const data = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const entry = dayMap.get(dateStr) || { work: 0, break: 0 };
      data.push({
        day: days[i],
        date: dateStr,
        workedHours: Math.round(entry.work * 100) / 100,
        breakHours: Math.round(entry.break * 100) / 100,
        work: Math.round(entry.work * 100) / 100,
        break: Math.round(entry.break * 100) / 100
      });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("[time-tracking/weekly]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
