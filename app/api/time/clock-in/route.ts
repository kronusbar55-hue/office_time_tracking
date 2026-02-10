import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { TimeSession } from "@/models/TimeSession";
import { format } from "date-fns";

export async function POST() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const userId = payload.sub;

    // Check for existing active session
    const active = await TimeSession.findOne({ user: userId, status: "active" }).lean();
    if (active) {
      return NextResponse.json({ error: "Active session already exists" }, { status: 409 });
    }

    const today = format(new Date(), "yyyy-MM-dd");

    const created = await TimeSession.create({
      user: userId,
      date: today,
      clockIn: new Date(),
      clockOut: null,
      totalWorkMinutes: 0,
      totalBreakMinutes: 0,
      status: "active"
    });

    return NextResponse.json({ data: { id: created._id.toString(), date: created.date, clockIn: created.clockIn } }, { status: 201 });
  } catch (error) {
    console.error("Clock-in error:", error);
    return NextResponse.json({ error: "Failed to clock in" }, { status: 500 });
  }
}
