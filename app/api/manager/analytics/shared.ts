import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  MANAGER_ANALYTICS_PRIORITIES,
  MANAGER_ANALYTICS_STATUSES,
  type ManagerAnalyticsFilters
} from "@/services/managerAnalytics.service";

const filtersSchema = z
  .object({
    projectIds: z.array(z.string().trim().min(1)).default([]),
    statuses: z.array(z.enum(MANAGER_ANALYTICS_STATUSES)).default([]),
    assigneeIds: z.array(z.string().trim().min(1)).default([]),
    priorities: z.array(z.enum(MANAGER_ANALYTICS_PRIORITIES)).default([]),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    organizationId: z.string().trim().optional()
  })
  .superRefine((value, ctx) => {
    if (value.startDate && Number.isNaN(new Date(value.startDate).getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startDate"], message: "Invalid startDate" });
    }

    if (value.endDate && Number.isNaN(new Date(value.endDate).getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "Invalid endDate" });
    }
  });

function splitParam(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function requireManager() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload || payload.role !== "manager") {
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

export function parseManagerAnalyticsFilters(request: Request): ManagerAnalyticsFilters {
  const { searchParams } = new URL(request.url);

  return filtersSchema.parse({
    projectIds: splitParam(searchParams.get("projectId")),
    statuses: splitParam(searchParams.get("status")),
    assigneeIds: splitParam(searchParams.get("assignee")),
    priorities: splitParam(searchParams.get("priority")),
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    organizationId: searchParams.get("organizationId") || undefined
  });
}
