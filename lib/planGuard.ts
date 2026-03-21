import { Organization } from "@/models/Organization";

type Plan = "FREE" | "PRO" | "ENTERPRISE";

const FEATURE_PLAN: Record<string, Plan> = {
  ADVANCED_REPORTS: "PRO",
  BILLING_EXPORTS: "ENTERPRISE",
  UNLIMITED_USERS: "PRO"
};

function planRank(plan: Plan) {
  if (plan === "ENTERPRISE") return 3;
  if (plan === "PRO") return 2;
  return 1;
}

export async function hasFeatureAccess(orgId: string, feature: keyof typeof FEATURE_PLAN) {
  const org = await Organization.findById(orgId).select("plan").lean();
  if (!org) return false;
  const required = FEATURE_PLAN[feature];
  return planRank(org.plan as Plan) >= planRank(required);
}

