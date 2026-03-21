export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
  HR: "hr"
} as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = typeof ROLES[RoleKey];

export const NAV_CONFIG = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.HR] },
  { label: "Kanban", href: "/kanban", icon: "kanban", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Projects", href: "/projects", icon: "projects", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Tasks", href: "/tasks", icon: "tasks", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Users", href: "/employees", icon: "users", allowed: [ROLES.ADMIN, ROLES.HR] },
  { label: "Reports", href: "/reports", icon: "reports", allowed: [ROLES.ADMIN, ROLES.HR] },
  { label: "Settings", href: "/settings", icon: "settings", allowed: [ROLES.ADMIN] },
  // Extra features
  { label: "Monitor", href: "/monitor", icon: "monitor", allowed: [ROLES.ADMIN, ROLES.MANAGER] },
  { label: "Time Tracking", href: "/attendance", icon: "time", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] }
];

export default ROLES;
