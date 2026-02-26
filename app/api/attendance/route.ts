import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { User } from "@/models/User";
import { TimeSession } from "@/models/TimeSession";
import { TimeSessionBreak } from "@/models/TimeSessionBreak";
import { formatISO } from "date-fns";

export interface AttendanceRecord {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  technology?: { id: string; name: string } | null;
  avatar?: string;
  checkIn?: Date;
  checkOut?: Date | null;
  breaks: Array<{
    startTime: Date;
    endTime?: Date | null;
    reason?: string;
  }>;
  workingHours: number;
  breakDuration: number;
  status: "checked-in" | "checked-out" | "on-break" | "not-checked-in";
  notes?: string;
}

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    let dateParam = searchParams.get("date") || new Date().toISOString();

    if (dateParam.includes("T")) {
      dateParam = dateParam.split("T")[0];
    }

    const technology = searchParams.get("technology");
    const search = searchParams.get("search")?.toLowerCase() || "";
    const status = searchParams.get("status");

    const dateStr = dateParam;
    const now = new Date();

    let userQuery = User.find({ isDeleted: false, isActive: true }).populate({
      path: "technology",
      select: "name"
    });

    if (technology && technology !== "all") {
      userQuery = userQuery.where("technology").equals(technology);
    }

    const users = await userQuery.lean();
    const userIds = users.map((u: { _id: unknown }) => u._id);

    const sessions = await TimeSession.find({
      user: { $in: userIds },
      date: dateStr
    }).lean();

    const sessionIds = sessions.map((s: { _id: unknown }) => s._id);
    const breaks =
      sessionIds.length > 0
        ? await TimeSessionBreak.find({ timeSession: { $in: sessionIds } }).lean()
        : [];

    const sessionBreaksMap = new Map<string, Array<{ breakStart: Date; breakEnd: Date | null | undefined; durationMinutes?: number }>>();
    let hasOngoingBreakBySession = new Map<string, boolean>();

    breaks.forEach((b: { timeSession: { toString: () => string }; breakStart: Date; breakEnd?: Date | null; durationMinutes?: number }) => {
      const sid = b.timeSession?.toString?.() ?? String(b.timeSession);
      if (!sessionBreaksMap.has(sid)) {
        sessionBreaksMap.set(sid, []);
        hasOngoingBreakBySession.set(sid, false);
      }
      sessionBreaksMap.get(sid)!.push({
        breakStart: b.breakStart,
        breakEnd: b.breakEnd ?? null,
        durationMinutes: b.durationMinutes
      });
      if (!b.breakEnd) {
        hasOngoingBreakBySession.set(sid, true);
      }
    });

    const allRecords: AttendanceRecord[] = users
      .map((user: any) => {
        const uid = user._id.toString();
        const session = sessions.find(
          (s: any) => s.user.toString() === uid
        );

        let attendanceStatus: AttendanceRecord["status"] = "not-checked-in";
        let workingHours = 0;
        let breakDuration = 0;
        let checkIn: Date | undefined;
        let checkOut: Date | null = null;
        const breaksList: Array<{ startTime: Date; endTime?: Date | null; reason?: string }> = [];

        if (session) {
          const s = session as any;
          checkIn = s.clockIn;
          checkOut = s.clockOut ?? null;
          const sid = s._id.toString();
          const sessionBreaks = sessionBreaksMap.get(sid) || [];
          const hasOngoingBreak = hasOngoingBreakBySession.get(sid) ?? false;

          sessionBreaks.forEach((b) => {
            breaksList.push({
              startTime: b.breakStart,
              endTime: b.breakEnd,
              reason: undefined
            });
          });

          breakDuration = (s.totalBreakMinutes || 0) / 60;

          if (s.status === "completed") {
            workingHours = (s.totalWorkMinutes || 0) / 60;
            attendanceStatus = "checked-out";
          } else {
            const clockInMs = new Date(s.clockIn).getTime();
            const endMs = checkOut ? new Date(checkOut).getTime() : now.getTime();
            let totalBreakMs = 0;
            sessionBreaks.forEach((b) => {
              const end = b.breakEnd ? new Date(b.breakEnd).getTime() : now.getTime();
              totalBreakMs += end - new Date(b.breakStart).getTime();
            });
            workingHours = Math.max(0, (endMs - clockInMs) / 3600000 - totalBreakMs / 3600000);

            if (hasOngoingBreak) {
              attendanceStatus = "on-break";
            } else {
              attendanceStatus = "checked-in";
            }
          }
        }

        return {
          id: uid,
          userId: uid,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          technology: user.technology && typeof user.technology === "object" && "name" in user.technology
            ? {
              id: String((user.technology as { _id?: unknown })._id ?? user.technology),
              name: (user.technology as { name: string }).name
            }
            : null,
          avatar: user.avatarUrl,
          checkIn,
          checkOut,
          breaks: breaksList,
          workingHours: Math.round(workingHours * 100) / 100,
          breakDuration: Math.round(breakDuration * 100) / 100,
          status: attendanceStatus,
          notes: (session as { notes?: string })?.notes
        };
      })
      .sort((a, b) =>
        `${a.firstName}${a.lastName}`.localeCompare(`${b.firstName}${b.lastName}`)
      );

    const summary = {
      totalEmployees: allRecords.length,
      checkedIn: allRecords.filter((r) => r.status === "checked-in").length,
      checkedOut: allRecords.filter((r) => r.status === "checked-out").length,
      onBreak: allRecords.filter((r) => r.status === "on-break").length,
      notCheckedIn: allRecords.filter((r) => r.status === "not-checked-in").length
    };

    const filteredRecords = allRecords.filter((record) => {
      if (
        search &&
        !record.firstName.toLowerCase().includes(search) &&
        !record.lastName.toLowerCase().includes(search) &&
        !record.userId.toLowerCase().includes(search)
      ) {
        return false;
      }
      if (status && status !== "all" && record.status !== status) {
        return false;
      }
      return true;
    });

    return NextResponse.json({
      data: filteredRecords,
      summary,
      date: formatISO(new Date(dateStr + "T00:00:00Z"))
    });
  } catch (error) {
    console.error("Attendance API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance data" },
      { status: 500 }
    );
  }
}
