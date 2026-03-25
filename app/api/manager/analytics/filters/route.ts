import { NextResponse } from "next/server";
import { ManagerAnalyticsService } from "@/services/managerAnalytics.service";
import { requireManager } from "../shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const auth = await requireManager();
  if (!auth.ok) return auth.response;

  try {
    const data = await ManagerAnalyticsService.getFilterOptions(auth.payload.sub);

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("[manager/analytics/filters]", error);
    return NextResponse.json({ success: false, message: "Failed to load filters" }, { status: 500 });
  }
}
