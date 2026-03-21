import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { Subscription } from "@/models/Subscription";
import bcrypt from "bcryptjs";
import { requireAuth, requireRole } from "@/lib/authz";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function GET() {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, ["SUPER_ADMIN"]);
    await connectDB();
    const orgs = await Organization.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(successResp("Fetched organizations", orgs));
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
      owner: null,
      plan: plan || "FREE",
      status: "ACTIVE"
    });

    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    const owner = await User.create({
      firstName: ownerFirstName || "Org",
      lastName: ownerLastName || "Admin",
      email: String(ownerEmail).toLowerCase(),
      passwordHash,
      role: "admin",
      organizationId: org._id,
      status: "ACTIVE",
      isActive: true
    });

    org.owner = owner._id;
    await org.save();

    const selectedPlan = org.plan || "FREE";
    const priceMonthly = selectedPlan === "PRO" ? 49 : selectedPlan === "ENTERPRISE" ? 199 : 0;
    await Subscription.create({
      organizationId: org._id,
      plan: selectedPlan,
      status: "ACTIVE",
      priceMonthly,
      startsAt: new Date()
    });

    return NextResponse.json(successResp("Organization created", { organization: org, owner }), { status: 201 });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    if (err?.message === "FORBIDDEN") return NextResponse.json(errorResp("Forbidden"), { status: 403 });
    return NextResponse.json(errorResp("Failed to create organization", err?.message || err), { status: 500 });
  }
}

