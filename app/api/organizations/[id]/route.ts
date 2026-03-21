import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";
import { requireAuth, requireRole } from "@/lib/authz";
import { Subscription } from "@/models/Subscription";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    await connectDB();
    const ctx = await requireAuth();
    requireRole(ctx, ["SUPER_ADMIN"]);

    const updates = await request.json();
    const org = await Organization.findByIdAndUpdate(params.id, updates, { new: true });
    
    if (!org) return NextResponse.json(errorResp("Organization not found"), { status: 404 });

    return NextResponse.json(successResp("Organization updated", org));
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    await connectDB();
    const ctx = await requireAuth();
    requireRole(ctx, ["SUPER_ADMIN"]);

    const org = await Organization.findByIdAndDelete(params.id);
    if (!org) return NextResponse.json(errorResp("Organization not found"), { status: 404 });

    // Also soft-delete or handle users? Usually, we just block them by status.
    await User.updateMany({ organizationId: params.id }, { status: "INACTIVE", isActive: false });
    await Subscription.updateMany({ organizationId: params.id }, { status: "CANCELLED" });

    return NextResponse.json(successResp("Organization deleted and users deactivated", null));
}
