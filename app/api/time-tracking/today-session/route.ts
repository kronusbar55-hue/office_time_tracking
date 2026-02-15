import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { TimeSession } from "@/models/TimeSession";
import { TimeSessionBreak } from "@/models/TimeSessionBreak";
import { format } from "date-fns";

export async function GET() {
  try {
    await connectDB();
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = format(new Date(), "yyyy-MM-dd");
    const session = await TimeSession.findOne({
      user: payload.sub,
      date: today,
      status: "active"
    }).lean();

    if (!session) {
      return NextResponse.json({
        active: false,
        clockInTime: null,
        breakStartTime: null,
        totalWorked: 0,
        totalBreak: 0
      });
    }

    const breaks = await TimeSessionBreak.find({ timeSession: session._id }).lean();
    const now = Date.now();
    const clockInMs = new Date((session as any).clockIn).getTime();
    let totalBreakMs = 0;
    let breakStartTime: string | null = null;

    breaks.forEach((b: any) => {
      const start = new Date(b.breakStart).getTime();
      const end = b.breakEnd ? new Date(b.breakEnd).getTime() : now;
      totalBreakMs += Math.max(0, end - start);
      if (!b.breakEnd) breakStartTime = new Date(b.breakStart).toISOString();
    });

    const totalWorkedMs = Math.max(0, now - clockInMs - totalBreakMs);

    return NextResponse.json({
      active: true,
      clockInTime: (session as any).clockIn,
      breakStartTime,
      totalWorked: totalWorkedMs / 1000 / 60 / 60,
      totalBreak: totalBreakMs / 1000 / 60 / 60
    });
  } catch (e) {
    console.error("[time-tracking/today-session]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
