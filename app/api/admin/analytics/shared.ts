import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import type { AnalyticsFilters } from "@/services/analytics.service";

export async function requireAdmin() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload || payload.role !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    };
  }

  await connectDB();

  return {
    ok: true as const,
    payload
  };
}

export function parseAnalyticsFilters(request: Request): AnalyticsFilters {
  const { searchParams } = new URL(request.url);
  const today = new Date();
  const priorWeek = new Date(today);
  priorWeek.setDate(today.getDate() - 6);

  return {
    startDate: searchParams.get("startDate") || priorWeek.toISOString().split("T")[0],
    endDate: searchParams.get("endDate") || today.toISOString().split("T")[0],
    employeeId: searchParams.get("employeeId") || undefined,
    department: searchParams.get("department") || undefined,
    organizationId: searchParams.get("organizationId") || undefined,
    search: searchParams.get("search") || undefined,
    page: Number(searchParams.get("page") || "1"),
    limit: Number(searchParams.get("limit") || "10")
  };
}
