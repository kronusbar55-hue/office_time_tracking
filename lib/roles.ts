export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE"
} as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = typeof ROLES[RoleKey];

export const SAAS_ROLE_LABELS: Record<RoleValue, string> = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE"
};

export function normalizeRoleInput(value?: string | null): RoleValue | null {
  const normalized = String(value || "").trim();
  if (!normalized) return null;

  const lookup = normalized.toUpperCase();
  if (lookup === "SUPER_ADMIN") return ROLES.SUPER_ADMIN;
  if (lookup === "ADMIN") return ROLES.ADMIN;
  if (lookup === "MANAGER") return ROLES.MANAGER;
  if (lookup === "EMPLOYEE") return ROLES.EMPLOYEE;

  if (normalized === "SUPER_ADMIN") return ROLES.SUPER_ADMIN;
  if (normalized === "ADMIN") return ROLES.ADMIN;
  if (normalized === "MANAGER") return ROLES.MANAGER;
  if (normalized === "EMPLOYEE") return ROLES.EMPLOYEE;

  return null;
}

export function toRoleLabel(role?: string | null) {
  const normalized = normalizeRoleInput(role);
  return normalized ? SAAS_ROLE_LABELS[normalized] : String(role || "");
}

export const NAV_CONFIG = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Kanban", href: "/kanban", icon: "kanban", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Projects", href: "/projects", icon: "projects", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Tasks", href: "/tasks", icon: "tasks", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Users", href: "/employees", icon: "users", allowed: [ROLES.ADMIN] },
  { label: "Reports", href: "/reports", icon: "reports", allowed: [ROLES.ADMIN] },
  { label: "Settings", href: "/settings", icon: "settings", allowed: [ROLES.ADMIN] },
  { label: "Permissions", href: "/permissions", icon: "settings", allowed: [ROLES.ADMIN] },
  // Extra features
  { label: "Monitor", href: "/monitor", icon: "monitor", allowed: [ROLES.ADMIN, ROLES.MANAGER] },
  { label: "Time Tracking", href: "/attendance", icon: "time", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] }
];

export default ROLES;
