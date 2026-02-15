import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Mock data for monthly graph
    const monthlyData = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (29 - i));
      monthlyData.push({
        date: date.toISOString().split("T")[0],
        workedHours: 6 + Math.random() * 4,
        breakHours: 0.5 + Math.random() * 1.5,
        overtimeHours: Math.random() * 2,
      });
    }

    return NextResponse.json({ data: monthlyData });
  } catch (error) {
    console.error("Monthly graph error:", error);
    return NextResponse.json({ error: "Failed to fetch monthly data" }, { status: 500 });
  }
}
