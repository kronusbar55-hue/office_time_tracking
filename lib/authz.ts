import { cookies } from "next/headers";
import { verifyAuthToken, type AuthRole, type AuthTokenPayload } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";

export type AuthenticatedContext = {
  token: AuthTokenPayload;
  user: any;
};

export async function requireAuth(): Promise<AuthenticatedContext> {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;
  if (!payload) {
    throw new Error("UNAUTHORIZED");
  }

  await connectDB();
  const user = await User.findOne({
    _id: payload.sub,
    isDeleted: false
  }).lean();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return { token: payload, user };
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

  const org = await Organization.findById(ctx.token.orgId)
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

