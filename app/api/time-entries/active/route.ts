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

  // Get breaks for active session
  const breaks = await TimeSessionBreak.find({
    timeSession: session._id
  }).lean();

  // Calculate current work time
  const now = new Date();
  const clockInTime = new Date(session.clockIn);
  const elapsedMinutes = Math.round((now.getTime() - clockInTime.getTime()) / 60000);
  const breakMinutes = session.totalBreakMinutes || 0;
  const workMinutes = Math.max(0, elapsedMinutes - breakMinutes);

  return NextResponse.json({
    active: {
      id: session._id.toString(),
      date: session.date,
      clockIn: session.clockIn,
      elapsedMinutes,
      workMinutes,
      breakMinutes,
      breaks: breaks.map((b) => ({
        id: b._id.toString(),
        breakStart: b.breakStart,
        breakEnd: b.breakEnd,
        durationMinutes: b.durationMinutes || 0
      }))
    }
  });
}

