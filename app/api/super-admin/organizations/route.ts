import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { Subscription } from "@/models/Subscription";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { requireAuth, requireRole } from "@/lib/authz";
import { successResp, errorResp } from "@/lib/apiResponse";
import { buildCredentialDeliveryPayload, getPlanPriceMonthly } from "@/lib/platform";
import { normalizeRoleInput, toRoleLabel } from "@/lib/roles";

export async function GET() {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, ["SUPER_ADMIN"]);
    await connectDB();
    const orgs = await Organization.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "organizationId",
          as: "users"
        }
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "organizationId",
          as: "subscriptions"
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    return NextResponse.json(successResp("Fetched organizations", orgs.map((org: any) => {
      const owner = Array.isArray(org.users)
        ? org.users.find((user: any) => String(user._id) === String(org.owner))
        : null;
      const activeSubscription = Array.isArray(org.subscriptions)
        ? org.subscriptions.find((sub: any) => sub.status === "ACTIVE") || org.subscriptions[0]
        : null;

      return {
        id: org._id.toString(),
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        status: org.status,
        owner: owner ? {
          id: owner._id.toString(),
          name: `${owner.firstName} ${owner.lastName}`,
          email: owner.email,
          role: toRoleLabel(owner.role)
        } : null,
        totalUsers: Array.isArray(org.users) ? org.users.filter((user: any) => !user.isDeleted).length : 0,
        activeUsers: Array.isArray(org.users) ? org.users.filter((user: any) => !user.isDeleted && user.isActive && user.status === "ACTIVE").length : 0,
        activeSubscription: activeSubscription ? {
          id: activeSubscription._id.toString(),
          status: activeSubscription.status,
          plan: activeSubscription.plan,
          priceMonthly: activeSubscription.priceMonthly,
          startsAt: activeSubscription.startsAt
        } : null,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
      };
    })));
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    if (err?.message === "FORBIDDEN") return NextResponse.json(errorResp("Forbidden"), { status: 403 });
    return NextResponse.json(errorResp("Failed to fetch organizations", err?.message || err), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, ["SUPER_ADMIN"]);
    await connectDB();

    const { name, slug, ownerEmail, ownerPassword, ownerFirstName, ownerLastName, plan } = await request.json();
    if (!name || !slug || !ownerEmail || !ownerPassword) {
      return NextResponse.json(errorResp("Missing required fields"), { status: 400 });
    }

    const normalizedSlug = String(slug).toLowerCase().trim();
    const existingOrg = await Organization.findOne({ slug: normalizedSlug }).lean();
    if (existingOrg) return NextResponse.json(errorResp("Organization slug already exists"), { status: 409 });

    const existingUser = await User.findOne({ email: String(ownerEmail).toLowerCase(), isDeleted: false }).lean();
    if (existingUser) return NextResponse.json(errorResp("Owner email already exists"), { status: 409 });

    const org = await Organization.create({
      name,
      slug: normalizedSlug,
      owner: new Types.ObjectId(),
      plan: plan || "FREE",
      status: "ACTIVE"
    });

    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    const ownerRole = normalizeRoleInput("ADMIN") || "admin";
    const owner = await User.create({
      firstName: ownerFirstName || "Org",
      lastName: ownerLastName || "Admin",
      email: String(ownerEmail).toLowerCase(),
      passwordHash,
      role: ownerRole,
      organizationId: org._id,
      status: "ACTIVE",
      isActive: true
    });

    org.owner = owner._id;
    await org.save();

    const selectedPlan = org.plan || "FREE";
    const priceMonthly = getPlanPriceMonthly(selectedPlan);
    await Subscription.create({
      organizationId: org._id,
      plan: selectedPlan,
      status: "ACTIVE",
      priceMonthly,
      startsAt: new Date()
    });

    return NextResponse.json(successResp("Organization created", {
      organization: org,
      owner: {
        id: owner._id.toString(),
        email: owner.email,
        role: toRoleLabel(owner.role)
      },
      credentialDelivery: buildCredentialDeliveryPayload({
        loginPath: "/auth/login",
        email: owner.email,
        password: ownerPassword,
        organizationName: org.name,
        organizationSlug: org.slug,
        role: toRoleLabel(owner.role)
      })
    }), { status: 201 });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    if (err?.message === "FORBIDDEN") return NextResponse.json(errorResp("Forbidden"), { status: 403 });
    return NextResponse.json(errorResp("Failed to create organization", err?.message || err), { status: 500 });
  }
}

