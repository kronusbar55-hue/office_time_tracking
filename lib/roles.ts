export const ROLES = {
  ADMIN: "admin",
  HR: "hr",
  MANAGER: "manager",
  EMPLOYEE: "employee"
} as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = typeof ROLES[RoleKey];

export const NAV_CONFIG = [
  { label: "Dashboard", href: "/", icon: "dashboard", allowed: [ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Monitor", href: "/monitor", icon: "monitor", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Live Attendance", href: "/live-attendance", icon: "time", allowed: [ROLES.ADMIN] },
  { label: "Check-In/Out", href: "/check-in-out", icon: "checkin", allowed: [] },
  { label: "Reports", href: "/reports", icon: "reports", allowed: [ROLES.ADMIN, ROLES.HR] },
  { label: "Employee Report", href: "/employee-report", icon: "employee_report", allowed: [ROLES.ADMIN, ROLES.HR] },
  { label: "Leave Management", href: "/leaves", icon: "leaves", allowed: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Technologies", href: "/technologies", icon: "tech", allowed: [ROLES.ADMIN] },
  { label: "Projects", href: "/projects", icon: "projects", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Project Update", href: "/project-updates", icon: "projects", allowed: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] },
  { label: "Tasks", href: "/tasks", icon: "tasks", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Announcements", href: "/announcements", icon: "announcements", allowed: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Employees", href: "/employees", icon: "users", allowed: [ROLES.ADMIN, ROLES.HR] },
  { label: "Settings", href: "/settings", icon: "settings", allowed: [ROLES.ADMIN] }
];

export default ROLES;
