export const ROLES = {
  ADMIN: "admin",
  HR: "hr",
  MANAGER: "manager",
  EMPLOYEE: "employee"
} as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = typeof ROLES[RoleKey];

export const NAV_CONFIG = [
  { label: "Dashboard", href: "/", icon: "dashboard", allowed: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Time Tracking", href: "/time-tracking", icon: "time", allowed: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Attendance", href: "/attendance", icon: "calendar", allowed: [ROLES.ADMIN, ROLES.HR] },
  { label: "Check-In/Out", href: "/check-in-out", icon: "checkin", allowed: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] },
  { label: "Timesheets", href: "/timesheets", icon: "timesheets", allowed: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Reports", href: "/reports", icon: "reports", allowed: [ROLES.ADMIN, ROLES.HR] },
  { label: "Leave Management", href: "/leaves", icon: "leaves", allowed: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Technologies", href: "/technologies", icon: "tech", allowed: [ROLES.ADMIN] },
  { label: "Projects", href: "/projects", icon: "projects", allowed: [ROLES.ADMIN, ROLES.MANAGER] },
  { label: "Tasks", href: "/tasks", icon: "tasks", allowed: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Announcements", href: "/announcements", icon: "announcements", allowed: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE] },
  { label: "Employees", href: "/employees", icon: "users", allowed: [ROLES.ADMIN, ROLES.HR] },
  { label: "Settings", href: "/settings", icon: "settings", allowed: [ROLES.ADMIN] }
];

export default ROLES;
