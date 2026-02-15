import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Mock data for daily graph - in production, query from database
    const today = new Date();
    const dailyData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dailyData.push({
        date: date.toISOString().split("T")[0],
        workedHours: 6 + Math.random() * 4,
        breakHours: 0.5 + Math.random() * 1,
        overtimeHours: Math.random() * 2,
      });
    }

    return NextResponse.json({ data: dailyData });
  } catch (error) {
    console.error("Graph API error:", error);
    return NextResponse.json({ error: "Failed to fetch graph data" }, { status: 500 });
  }
}
