import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeEntry } from "@/models/TimeEntry";
import { Task } from "@/models/Task";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId") || payload.sub;
  const startParam = url.searchParams.get("startDate");
  const endParam = url.searchParams.get("endDate");

  const now = new Date();
  let start = startParam ? new Date(startParam) : new Date(now);
  if (!startParam) start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  let end = endParam ? new Date(endParam) : new Date(now);
  end.setHours(23, 59, 59, 999);

  // Build aggregation to compute per-day totals and break minutes
  const mongoose = await import("mongoose");
  const userObjectId = mongoose.default.Types.ObjectId.createFromHexString(
    employeeId
  );

  // Get monitor stats for the range
  const { getMonitorStats } = await import("@/lib/monitorUtils");
  const monitorStats = await getMonitorStats(employeeId, start, end);

  const totals = monitorStats.reduce(
    (acc, e) => {
      acc.totalWorkMinutes += e.workedMinutes;
      acc.totalBreakMinutes += e.breakMinutes;
      acc.sessions += 1;
      acc.presentDays += e.workedMinutes > 0 ? 1 : 0;
      return acc;
    },
    { totalWorkMinutes: 0, totalBreakMinutes: 0, sessions: 0, presentDays: 0 }
  );

  return NextResponse.json({
    range: { start, end },
    totals: {
      totalWorkMinutes: Math.round(totals.totalWorkMinutes),
      totalBreakMinutes: Math.round(totals.totalBreakMinutes),
      sessions: totals.sessions,
      presentDays: totals.presentDays
    },
    byDay: monitorStats.map((e) => ({
      date: e.date,
      totalWorkMinutes: e.workedMinutes,
      totalBreakMinutes: e.breakMinutes
    }))
  });
}

