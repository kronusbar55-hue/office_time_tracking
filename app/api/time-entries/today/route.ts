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
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const entries = await TimeEntry.find({
    user: payload.sub,
    clockIn: { $gte: start, $lte: end }
  })
    .sort({ clockIn: 1 })
    .lean();

  return NextResponse.json({
    sessions: entries.map((e) => ({
      id: e._id.toString(),
      clockIn: e.clockIn,
      clockOut: e.clockOut,
      // `TimeEntry` does not store `durationMinutes` directly; derive it here.
      durationMinutes: e.clockOut
        ? Math.round(
            (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) /
              1000 /
              60
          )
        : null
    }))
  });
}

