import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { toRoleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = cookies().get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  try {
    const ctx = await requireAuth();
    const u = ctx.user as any;
    const org = ctx.organization as any;

    return NextResponse.json({
      user: {
        id: u._id.toString(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        roleLabel: toRoleLabel(u.role),
        status: u.status,
        organizationId: org?._id?.toString() || null,
        organizationName: org?.name || null,
        organizationStatus: org?.status || null,
        plan: org?.plan || null,
        sessionType: ctx.token.sessionType || (u.role === "SUPER_ADMIN" ? "super-admin" : "organization")
      }
    });
  } catch (err: any) {
    if (err?.message === "ORG_INACTIVE") {
      return NextResponse.json({ user: null }, { status: 403 });
    }
    return NextResponse.json({ user: null }, { status: 401 });
  }
}

