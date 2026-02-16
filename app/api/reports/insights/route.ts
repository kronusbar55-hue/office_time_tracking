import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { TimeSessionBreak } from "@/models/TimeSessionBreak";
import { User } from "@/models/User";
import { format, startOfDay, endOfDay, addDays, differenceInDays } from "date-fns";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (payload.role !== "admin" && payload.role !== "hr") {
      return NextResponse.json(
        { error: "Access denied. Admin or HR only." },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    const technology = searchParams.get("technology");

    const now = new Date();
    const startDate = startParam ? new Date(startParam) : addDays(now, -6);
    const endDate = endParam ? new Date(endParam) : new Date(now);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const dayCount = Math.max(1, differenceInDays(endDate, startDate) + 1);

    let userQuery = User.find({ isDeleted: false, isActive: true }).populate({
      path: "technology",
      select: "name"
    });

    if (technology && technology !== "all") {
      userQuery = userQuery.where("technology").equals(technology);
    }

    const users = await userQuery.lean();
    let userIds = users.map((u: { _id: unknown }) => u._id);

    if (employeeId && employeeId !== "all") {
      userIds = userIds.filter((id: unknown) => (id as any).toString() === employeeId);
      if (userIds.length === 0) {
        return NextResponse.json({
          stats: { totalWorkHours: 0, totalBreakHours: 0, presentDays: 0, avgDailyHours: 0 },
          byDay: [],
          employees: [],
          range: { start: format(startDate, "yyyy-MM-dd"), end: format(endDate, "yyyy-MM-dd") }
        });
      }
    }

    const sessions = await TimeSession.find({
      user: { $in: userIds },
      clockIn: { $gte: startDate, $lte: endDate }
    }).lean();

    const sessionIds = sessions.map((s: { _id: unknown }) => s._id);
    const breaks =
      sessionIds.length > 0
        ? await TimeSessionBreak.find({ timeSession: { $in: sessionIds } }).lean()
        : [];

    const breakMap = new Map<string, number>();
    breaks.forEach((b: any) => {
      const sid = (b as any).timeSession?.toString?.();
      if (!sid) return;
      const start = new Date(b.breakStart).getTime();
      const end = b.breakEnd ? new Date(b.breakEnd).getTime() : Date.now();
      breakMap.set(sid, (breakMap.get(sid) || 0) + (end - start) / 60000);
    });

    const dayMap = new Map<string, { work: number; break: number }>();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dayMap.set(format(d, "yyyy-MM-dd"), { work: 0, break: 0 });
    }

    const userStats = new Map<
      string,
      {
        workMinutes: number;
        breakMinutes: number;
        presentDays: Set<string>;
        name: string;
        email: string;
        technology?: { name: string };
      }
    >();

    users.forEach((u: any) => {
      userStats.set(u._id.toString(), {
        workMinutes: 0,
        breakMinutes: 0,
        presentDays: new Set(),
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        technology: u.technology as { name: string } | undefined
      });
    });

    sessions.forEach((s: any) => {
      const dateStr = format(new Date(s.clockIn), "yyyy-MM-dd");
      const dayEntry = dayMap.get(dateStr);
      if (!dayEntry) return;

      const breakMins = breakMap.get(s._id.toString()) ?? (s.totalBreakMinutes || 0);
      const clockInMs = new Date(s.clockIn).getTime();
      const clockOutMs = s.clockOut ? new Date(s.clockOut).getTime() : Date.now();
      const workMins = Math.max(0, (clockOutMs - clockInMs) / 60000 - breakMins);

      dayEntry.work += workMins / 60;
      dayEntry.break += breakMins / 60;

      const uid = s.user.toString();
      const stats = userStats.get(uid);
      if (stats) {
        stats.workMinutes += workMins;
        stats.breakMinutes += breakMins;
        stats.presentDays.add(dateStr);
      }
    });

    const byDay = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        label: format(new Date(date + "T00:00:00"), "EEE"),
        workHours: Math.round((v.work * 100) / 100),
        breakHours: Math.round((v.break * 100) / 100)
      }));

    const totalWorkMinutes = Array.from(userStats.values()).reduce((s, u) => s + u.workMinutes, 0);
    const totalBreakMinutes = Array.from(userStats.values()).reduce((s, u) => s + u.breakMinutes, 0);

    const employees = Array.from(userStats.entries())
      .map(([userId, stats]) => {
        const workHours = stats.workMinutes / 60;
        const attendance = dayCount > 0 ? Math.min(100, (stats.presentDays.size / dayCount) * 100) : 0;
        const expectedHours = dayCount * 8;
        const productivity = expectedHours > 0 ? Math.min(100, (workHours / expectedHours) * 100) : 0;

        return {
          id: userId,
          name: stats.name,
          email: stats.email,
          technology: stats.technology?.name || "N/A",
          workHours: Math.round(workHours * 100) / 100,
          breakHours: Math.round((stats.breakMinutes / 60) * 100) / 100,
          presentDays: stats.presentDays.size,
          attendance: Math.round(attendance),
          productivity: Math.round(productivity)
        };
      })
      .sort((a, b) => b.workHours - a.workHours);

    const stats = {
      totalWorkHours: Math.round((totalWorkMinutes / 60) * 100) / 100,
      totalBreakHours: Math.round((totalBreakMinutes / 60) * 100) / 100,
      presentDays: byDay.filter((d) => d.workHours > 0 || d.breakHours > 0).length,
      avgDailyHours:
        byDay.length > 0
          ? Math.round(
              (byDay.reduce((s, d) => s + d.workHours, 0) / byDay.length) * 100
            ) / 100
          : 0
    };

    return NextResponse.json({
      stats,
      byDay,
      employees,
      range: { start: format(startDate, "yyyy-MM-dd"), end: format(endDate, "yyyy-MM-dd") }
    });
  } catch (err) {
    console.error("[reports/insights]", err);
    return NextResponse.json(
      { error: "Failed to load report" },
      { status: 500 }
    );
  }
}
