import crypto from "crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, requireRole, requireActiveOrganization } from "@/lib/authz";
import { OrganizationInvite } from "@/models/OrganizationInvite";
import { successResp, errorResp } from "@/lib/apiResponse";
import { User } from "@/models/User";
import { buildCredentialDeliveryPayload } from "@/lib/platform";
import { normalizeRoleInput, toRoleLabel } from "@/lib/roles";

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, ["admin", "hr"]);
    await requireActiveOrganization(ctx);
    await connectDB();

    const { email, role } = await request.json();
    if (!email) return NextResponse.json(errorResp("Email required"), { status: 400 });
    const normalizedEmail = String(email).toLowerCase();
    const inviteRole = normalizeRoleInput(role) || "employee";
    if (inviteRole === "SUPER_ADMIN") {
      return NextResponse.json(errorResp("SUPER_ADMIN cannot be invited into an organization"), { status: 400 });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      organizationId: ctx.token.orgId,
      isDeleted: false
    }).lean();
    if (existingUser) {
      return NextResponse.json(errorResp("User already exists in this organization"), { status: 409 });
    }

    const rawToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const invite = await OrganizationInvite.create({
      organizationId: ctx.token.orgId,
      email: normalizedEmail,
      role: inviteRole,
      invitedBy: ctx.token.sub,
      tokenHash,
      expiresAt
    });

    return NextResponse.json(
      successResp("Invite created", {
        inviteId: invite._id.toString(),
        email: invite.email,
        role: invite.role,
        roleLabel: toRoleLabel(invite.role),
        inviteToken: rawToken,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/login?invite=${rawToken}`,
        credentialDelivery: buildCredentialDeliveryPayload({
          loginPath: "/auth/login",
          email: invite.email,
          organizationName: String(ctx.organization?.name || ""),
          organizationSlug: String(ctx.organization?.slug || ""),
          role: toRoleLabel(invite.role)
        })
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

