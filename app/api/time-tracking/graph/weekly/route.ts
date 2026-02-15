import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Mock data for weekly graph
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyData = days.map((day, idx) => ({
      day,
      workedHours: 7 + Math.random() * 2,
      breakHours: 0.5 + Math.random() * 1,
      overtimeHours: idx < 5 ? Math.random() * 1.5 : 0,
    }));

    return NextResponse.json({ data: weeklyData });
  } catch (error) {
    console.error("Weekly graph error:", error);
    return NextResponse.json({ error: "Failed to fetch weekly data" }, { status: 500 });
  }
}
