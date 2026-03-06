import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return NextResponse.json({ active: null }, { status: 401 });
  }

  await connectDB();

  const dateStr = new Date().toISOString().split("T")[0];

  // Get latest monitor record for real-time status
  const { getDayMonitorStats } = await import("@/lib/monitorUtils");
  const mStats = await getDayMonitorStats(payload.sub, dateStr);

  const latestMonitor = (await EmployeeMonitor.findOne({
    userId: payload.sub,
    date: dateStr
  }).sort({ createdAt: -1 }).lean()) as any;

  if (!latestMonitor) {
    return NextResponse.json({ active: null });
  }

  return NextResponse.json({
    active: {
      id: latestMonitor._id.toString(),
      date: dateStr,
      clockIn: latestMonitor.createdAt, // Approximate
      elapsedMinutes: mStats.sessionMinutes,
      workMinutes: mStats.workedMinutes,
      breakMinutes: mStats.breakMinutes,
      status: latestMonitor.status,
      breaks: [] // Monitor doesn't explicitly list break intervals in this way
    }
  });
}

