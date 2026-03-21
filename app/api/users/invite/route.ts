import crypto from "crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, requireRole, requireActiveOrganization } from "@/lib/authz";
import { OrganizationInvite } from "@/models/OrganizationInvite";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, ["admin", "hr"]);
    await requireActiveOrganization(ctx);
    await connectDB();

    const { email, role } = await request.json();
    if (!email) return NextResponse.json(errorResp("Email required"), { status: 400 });

    const rawToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const invite = await OrganizationInvite.create({
      organizationId: ctx.token.orgId,
      email: String(email).toLowerCase(),
      role: role || "employee",
      invitedBy: ctx.token.sub,
      tokenHash,
      expiresAt
    });

    return NextResponse.json(
      successResp("Invite created", {
        inviteId: invite._id.toString(),
        email: invite.email,
        role: invite.role,
        // In production, send via email provider; returning temporarily for integration.
        inviteToken: rawToken
      }),
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    if (err?.message === "FORBIDDEN") return NextResponse.json(errorResp("Forbidden"), { status: 403 });
    if (err?.message === "ORG_INACTIVE") return NextResponse.json(errorResp("Organization inactive"), { status: 403 });
    return NextResponse.json(errorResp("Failed to create invite", err?.message || err), { status: 500 });
  }
}

