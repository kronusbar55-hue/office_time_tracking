import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { successResp, errorResp } from "@/lib/apiResponse";
import { requireAuth, requireRole } from "@/lib/authz";
import { Subscription } from "@/models/Subscription";

export async function GET(request: Request) {
    await connectDB();
    const ctx = await requireAuth();
    requireRole(ctx, ["SUPER_ADMIN"]);

    const orgs = await Organization.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(successResp("Fetched all organizations", orgs));
}

export async function POST(request: Request) {
    await connectDB();
    const ctx = await requireAuth();
    requireRole(ctx, ["SUPER_ADMIN"]);

    const { name, slug, ownerEmail, ownerPassword, ownerFirstName, ownerLastName, plan } = await request.json();

    if (!name || !slug || !ownerEmail || !ownerPassword) {
        return NextResponse.json(errorResp("Missing required fields"), { status: 400 });
    }

    // 1. Check if organization already exists
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) return NextResponse.json(errorResp("Organization with this slug already exists"), { status: 400 });

    const existingUser = await User.findOne({ email: ownerEmail.toLowerCase() });
    if (existingUser) return NextResponse.json(errorResp("User email already in use"), { status: 400 });

    // Start creation
    const org = await Organization.create({
        name,
        slug: slug.toLowerCase(),
        plan: plan || "FREE",
        status: "ACTIVE",
        owner: new (require('mongoose').Types.ObjectId)() // Temporary placeholder
    });

    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    const user = await User.create({
        firstName: ownerFirstName || "Org",
        lastName: ownerLastName || "Owner",
        email: ownerEmail.toLowerCase(),
        passwordHash,
        role: "admin", // Organization Admin
        organizationId: org._id,
        status: "ACTIVE",
        isActive: true,
        isDeleted: false
    });

    // Link owner
    org.owner = user._id;
    await org.save();

    const plan = org.plan || "FREE";
    const priceMonthly = plan === "PRO" ? 49 : plan === "ENTERPRISE" ? 199 : 0;
    await Subscription.create({
      organizationId: org._id,
      plan,
      status: "ACTIVE",
      priceMonthly,
      startsAt: new Date()
    });

    return NextResponse.json(successResp("Organization created successfully", { org, user }));
}
