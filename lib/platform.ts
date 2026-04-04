import bcrypt from "bcryptjs";
import { User } from "@/models/User";
import { UserSession } from "@/models/UserSession";
import { type EntityStatus, type PlanName } from "@/lib/auth";

export const PLATFORM_SUPER_ADMIN = {
  email: "admin.pk@technotoil.com",
  password: "PK@12345",
  firstName: "Platform",
  lastName: "Admin"
} as const;

export const PLAN_PRICING: Record<PlanName, number> = {
  FREE: 0,
  PRO: 49,
  ENTERPRISE: 199
};

export function getPlanPriceMonthly(plan?: string | null) {
  if (plan === "PRO" || plan === "ENTERPRISE" || plan === "FREE") {
    return PLAN_PRICING[plan];
  }
  return PLAN_PRICING.FREE;
}

export async function ensurePlatformSuperAdmin() {
  const passwordHash = await bcrypt.hash(PLATFORM_SUPER_ADMIN.password, 10);

  return User.findOneAndUpdate(
    { email: PLATFORM_SUPER_ADMIN.email.toLowerCase() },
    {
      $set: {
        firstName: PLATFORM_SUPER_ADMIN.firstName,
        lastName: PLATFORM_SUPER_ADMIN.lastName,
        role: "SUPER_ADMIN",
        organizationId: null,
        status: "ACTIVE",
        isActive: true,
        isDeleted: false,
        passwordHash
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
}

export async function revokeSessionsForOrganization(organizationId: string) {
  await UserSession.updateMany(
    { organizationId, revokedAt: null },
    { revokedAt: new Date() }
  );
}

export function buildCredentialDeliveryPayload(input: {
  loginPath: string;
  email: string;
  password?: string;
  organizationName?: string;
  organizationSlug?: string;
  role?: string;
}) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";

  return {
    deliveryStatus: "PENDING_EMAIL_PROVIDER",
    emailPreview: {
      to: input.email,
      subject: input.organizationName
        ? `Your ${input.organizationName} account is ready`
        : "Your account is ready",
      body: {
        loginUrl: `${appUrl}${input.loginPath}`,
        email: input.email,
        password: input.password || null,
        organizationName: input.organizationName || null,
        organizationSlug: input.organizationSlug || null,
        role: input.role || null
      }
    }
  };
}

export function isBlockedStatus(status?: string | null): status is Exclude<EntityStatus, "ACTIVE"> {
  return status === "INACTIVE" || status === "SUSPENDED";
}
