import { cookies } from "next/headers";
import { verifyAuthToken, type AuthRole, type AuthTokenPayload } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { Permission, type ModuleName, type ActionName } from "@/models/Permission";
import { UserSession } from "@/models/UserSession";
import crypto from "crypto";

export type AuthenticatedContext = {
  token: AuthTokenPayload;
  user: any;
  organization?: any;
};

export async function requireAuth(): Promise<AuthenticatedContext> {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }
  const payload = verifyAuthToken(token);
  if (!payload) {
    throw new Error("UNAUTHORIZED");
  }

  await connectDB();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const activeSession = await UserSession.findOne({
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  }).lean();

  if (!activeSession) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await User.findOne({
    _id: payload.sub,
    isDeleted: false,
    isActive: true,
    status: "ACTIVE"
  }).lean();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  let organization = null;
  if (payload.role !== "SUPER_ADMIN") {
    organization = await Organization.findById(payload.orgId)
      .select("_id name slug status plan")
      .lean() as any;
    if (!organization || organization.status !== "ACTIVE") {
      throw new Error("ORG_INACTIVE");
    }
  }

  return { token: payload, user, organization };
}

export function requireRole(
  ctx: AuthenticatedContext,
  allowed: AuthRole[]
) {
  if (!allowed.includes(ctx.token.role)) {
    throw new Error("FORBIDDEN");
  }
}

export async function requireActiveOrganization(ctx: AuthenticatedContext) {
  if (ctx.token.role === "SUPER_ADMIN") return;
  if (!ctx.token.orgId) throw new Error("FORBIDDEN");

  const org = ctx.organization || await Organization.findById(ctx.token.orgId)
    .select("_id status")
    .lean();
  if (!org || org.status !== "ACTIVE") {
    throw new Error("ORG_INACTIVE");
  }
}

export function withTenantQuery<T extends Record<string, any>>(
  ctx: AuthenticatedContext,
  query: T
): T {
  if (ctx.token.role === "SUPER_ADMIN") return query;
  if (!ctx.token.orgId) throw new Error("FORBIDDEN");
  return { ...query, organizationId: ctx.token.orgId };
}

export async function requirePermission(
  ctx: AuthenticatedContext,
  module: ModuleName,
  action: ActionName
) {
  if (ctx.token.role === "SUPER_ADMIN") return; // Super admin has all permissions

  const permission = await Permission.findOne({
    organizationId: ctx.token.orgId,
    role: ctx.token.role,
    module,
    actions: action
  });

  if (!permission) {
    throw new Error("PERMISSION_DENIED");
  }
}

