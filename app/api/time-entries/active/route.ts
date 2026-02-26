import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { TimeSessionBreak } from "@/models/TimeSessionBreak";

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return NextResponse.json({ active: null }, { status: 401 });
  }

  await connectDB();

  // Get today's date
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  // Find active session for today
  const session = await TimeSession.findOne({
    user: payload.sub,
    date: dateStr,
    status: "active"
  }).lean();

  if (!session) {
    return NextResponse.json({ active: null });
  }

  const s = session as any;

  // Get breaks for active session
  const breaks = await TimeSessionBreak.find({
    timeSession: s._id
  }).lean();

  const bks = breaks as any[];

  // Calculate current work time
  const now = new Date();
  const clockInTime = new Date(s.clockIn);
  const elapsedMinutes = Math.round((now.getTime() - clockInTime.getTime()) / 60000);
  const breakMinutes = s.totalBreakMinutes || 0;
  const workMinutes = Math.max(0, elapsedMinutes - breakMinutes);

  return NextResponse.json({
    active: {
      id: s._id.toString(),
      date: s.date,
      clockIn: s.clockIn,
      elapsedMinutes,
      workMinutes,
      breakMinutes,
      breaks: bks.map((b) => ({
        id: b._id.toString(),
        breakStart: b.breakStart,
        breakEnd: b.breakEnd,
        durationMinutes: b.durationMinutes || 0
      }))
    }
  });
}

