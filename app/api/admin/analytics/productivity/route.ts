import { NextResponse } from "next/server";
import { AnalyticsService } from "@/services/analytics.service";
import { parseAnalyticsFilters, requireAdmin } from "../shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const filters = parseAnalyticsFilters(request, auth.payload);
    const snapshot = await AnalyticsService.getAnalyticsSnapshot(filters);

    return NextResponse.json({
      success: true,
      data: snapshot.productivity
    });
  } catch (error) {
    console.error("[admin/analytics/productivity]", error);
    return NextResponse.json({ success: false, message: "Failed to load productivity analytics" }, { status: 500 });
  }
}
