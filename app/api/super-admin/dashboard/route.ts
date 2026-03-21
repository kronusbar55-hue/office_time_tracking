import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";
import { requireAuth, requireRole } from "@/lib/authz";
import { Subscription } from "@/models/Subscription";

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, ["SUPER_ADMIN"]);
    await connectDB();

    const totalOrgs = await Organization.countDocuments();
    const totalUsers = await User.countDocuments({ role: { $ne: "SUPER_ADMIN" }, isDeleted: false });
    const activeSubs = await Subscription.countDocuments({ status: "ACTIVE" });
    
    // Basic revenue calculation (mock for now or based on plans)
    const activeSubsList = await Subscription.find({ status: "ACTIVE" }).lean();
    const revenue = activeSubsList.reduce((sum, s) => sum + (s.priceMonthly || 0), 0);

    return NextResponse.json(successResp("Dashboard data fetched", {
      stats: {
        totalOrganizations: totalOrgs,
        totalUsers: totalUsers,
        activeSubscriptions: activeSubs,
        totalRevenue: revenue
      }
    }));
  } catch (error: any) {
    return NextResponse.json(errorResp(error.message), { status: 500 });
  }
}
