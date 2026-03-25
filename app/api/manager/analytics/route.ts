import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ManagerAnalyticsService } from "@/services/managerAnalytics.service";
import { parseManagerAnalyticsFilters, requireManager } from "./shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const auth = await requireManager();
  if (!auth.ok) return auth.response;

  try {
    const filters = parseManagerAnalyticsFilters(request);
    const data = await ManagerAnalyticsService.getAnalyticsSnapshot(auth.payload.sub, filters);

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("[manager/analytics]", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid analytics filters",
          errors: error.flatten()
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, message: "Failed to load data" }, { status: 500 });
  }
}
