import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";
import { requireAuth, requireRole } from "@/lib/authz";
import { Subscription } from "@/models/Subscription";
import { ensurePlatformSuperAdmin } from "@/lib/platform";

export async function GET(request: Request) {
  try {
    await connectDB();
    await ensurePlatformSuperAdmin();
    const ctx = await requireAuth();
    requireRole(ctx, ["SUPER_ADMIN"]);

    const totalOrgs = await Organization.countDocuments();
    const activeOrgs = await Organization.countDocuments({ status: "ACTIVE" });

    return NextResponse.json(successResp("Dashboard data fetched", {
      totalOrganizations: totalOrgs,
      activeOrganizations: activeOrgs
    }));
  } catch (error: any) {
    return NextResponse.json(errorResp(error.message), { status: 500 });
  }
}
