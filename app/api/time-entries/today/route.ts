import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeEntry } from "@/models/TimeEntry";

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return NextResponse.json({ sessions: [] }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const { getDayMonitorStats } = await import("@/lib/monitorUtils");
  const mStats = await getDayMonitorStats(payload.sub, now.toISOString().split("T")[0]);

  return NextResponse.json({
    sessions: [
      {
        id: "monitor-total",
        clockIn: start, // Today start
        clockOut: null,
        durationMinutes: mStats.workedMinutes,
        breakMinutes: mStats.breakMinutes
      }
    ]
  });
}

