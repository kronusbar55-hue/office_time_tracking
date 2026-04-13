import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyAuthToken, type JwtPayload } from "@/lib/auth";
import { User } from "@/models/User";
import { SUPER_ADMIN_ROLE } from "@/lib/superAdmin";

export interface TenantContext {
  payload: JwtPayload | null;
  currentUser: any | null;
  effectiveTenantId: string | null;
  isSuperAdmin: boolean;
}

export async function getTenantContext(): Promise<TenantContext> {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return {
      payload: null,
      currentUser: null,
      effectiveTenantId: null,
      isSuperAdmin: false
    };
  }

  const role = String(payload.role || "").toLowerCase();
  if (role === SUPER_ADMIN_ROLE) {
    return {
      payload,
      currentUser: null,
      effectiveTenantId: null,
      isSuperAdmin: true
    };
  }

  if (payload.tenantId) {
    return {
      payload,
      currentUser: null,
      effectiveTenantId: payload.tenantId,
      isSuperAdmin: false
    };
  }

  await connectDB();
  const currentUser = await User.findById(payload.sub)
    .select("_id role tenantId")
    .lean() as any;

  const effectiveTenantId = currentUser
    ? String(currentUser.role).toLowerCase() === "admin"
      ? String(currentUser._id)
      : currentUser.tenantId
        ? String(currentUser.tenantId)
        : payload.tenantId || payload.sub
    : payload.tenantId || payload.sub;

  return {
    payload,
    currentUser,
    effectiveTenantId,
    isSuperAdmin: false
  };
}

export function applyTenantFilter(query: any, context: TenantContext) {
  if (context.isSuperAdmin || !context.effectiveTenantId) return query;
  return { ...query, tenantId: context.effectiveTenantId };
}
