import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { Subscription } from "@/models/Subscription";
import { requireAuth, requireRole } from "@/lib/authz";
import { successResp, errorResp } from "@/lib/apiResponse";
import { getPlanPriceMonthly, revokeSessionsForOrganization } from "@/lib/platform";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, ["SUPER_ADMIN"]);
    await connectDB();

    const updates = await request.json();
    const allowed = {
      name: updates.name,
      slug: updates.slug ? String(updates.slug).toLowerCase() : undefined,
      plan: updates.plan,
      status: updates.status
    };
    if (allowed.slug) {
      const existingSlug = await Organization.findOne({ slug: allowed.slug, _id: { $ne: params.id } }).lean();
      if (existingSlug) {
        return NextResponse.json(errorResp("Organization slug already exists"), { status: 409 });
      }
    }
    const org = await Organization.findByIdAndUpdate(params.id, allowed, { new: true });
    if (!org) return NextResponse.json(errorResp("Organization not found"), { status: 404 });

    if (updates.plan) {
      const priceMonthly = getPlanPriceMonthly(updates.plan);
      await Subscription.findOneAndUpdate(
        { organizationId: org._id, status: { $in: ["ACTIVE", "INACTIVE"] } },
        { plan: updates.plan, priceMonthly },
        { upsert: true, new: true }
      );
    }

    if (updates.status && updates.status !== "ACTIVE") {
      await User.updateMany(
        { organizationId: org._id, role: { $ne: "SUPER_ADMIN" } },
        { isActive: false, status: updates.status === "SUSPENDED" ? "SUSPENDED" : "INACTIVE" }
      );
      await revokeSessionsForOrganization(org._id.toString());
    }

    if (updates.status === "ACTIVE") {
      await User.updateMany(
        { organizationId: org._id, role: { $ne: "SUPER_ADMIN" }, isDeleted: false },
        { isActive: true, status: "ACTIVE" }
      );
    }

    return NextResponse.json(successResp("Organization updated", org));
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    if (err?.message === "FORBIDDEN") return NextResponse.json(errorResp("Forbidden"), { status: 403 });
    return NextResponse.json(errorResp("Failed to update organization", err?.message || err), { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, ["SUPER_ADMIN"]);
    await connectDB();

    const org = await Organization.findByIdAndDelete(params.id);
    if (!org) return NextResponse.json(errorResp("Organization not found"), { status: 404 });
    await User.updateMany({ organizationId: params.id }, { isActive: false, status: "INACTIVE" });
    await Subscription.updateMany({ organizationId: params.id }, { status: "CANCELLED" });
    await revokeSessionsForOrganization(params.id);
    return NextResponse.json(successResp("Organization deleted", null));
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    if (err?.message === "FORBIDDEN") return NextResponse.json(errorResp("Forbidden"), { status: 403 });
    return NextResponse.json(errorResp("Failed to delete organization", err?.message || err), { status: 500 });
  }
}

