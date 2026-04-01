"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Clock3, LayoutDashboard, CalendarCheck, FileSpreadsheet, BarChart3, Code, UserSquare2, ListChecks, Megaphone, Users, Settings, CalendarDays, Monitor, FileText } from "lucide-react";
import { NAV_CONFIG, ROLES } from "@/lib/roles";
import { LogOut } from "lucide-react";
import LogoutConfirmModal from "./LogoutConfirmModal";

type NavItem = {
  label: string;
  href: string;
  icon?: any;
};

const ICON_MAP: Record<string, any> = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  monitor: <Monitor className="h-4 w-4" />,
  time: <Clock3 className="h-4 w-4" />,
  calendar: <CalendarDays className="h-4 w-4" />,
  timesheets: <FileSpreadsheet className="h-4 w-4" />,
  reports: <BarChart3 className="h-4 w-4" />,
  employee_report: <FileText className="h-4 w-4" />,
  leaves: <CalendarCheck className="h-4 w-4" />,
  tech: <Code className="h-4 w-4" />,
  projects: <UserSquare2 className="h-4 w-4" />,
  tasks: <ListChecks className="h-4 w-4" />,
  announcements: <Megaphone className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />
};

export function Sidebar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const pathname = usePathname();

  const role = user?.role ?? null;
  const navItems = isAuthenticated ? NAV_CONFIG.filter((n) => {
    if (!role) return false;
    return n.allowed.includes(role as any);
  }) : [];

  if (!isAuthenticated) return null;

  return (
    <aside className="sticky top-0 h-screen hidden w-64 flex-col border-r border-card-border bg-bg-secondary px-4 pb-4 pt-6 shadow-lg dark:shadow-lg md:flex transition-colors duration-200 z-[100]">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-slate-950">
          <Clock3 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">Technotoil WorkPortal</p>
          <p className="text-[11px] text-text-secondary">Work Portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 text-sm overflow-y-auto pr-2 custom-scrollbar">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href} className={`group flex items-center gap-2 rounded-lg px-2 py-2 transition-all duration-200 ${active ? "bg-accent/20 dark:bg-accent/15 text-accent font-semibold" : "text-text-secondary hover:bg-card-hover dark:hover:bg-card-hover hover:text-text-primary"}`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-card-hover dark:bg-bg-tertiary text-text-secondary group-hover:bg-accent/20 dark:group-hover:bg-accent/10 group-hover:text-accent transition-colors duration-200">
                {ICON_MAP[item.icon || 'dashboard']}
              </span>
              <span className="truncate text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-card-border pt-4 space-y-3">
        {user && (
          <div className="flex items-center gap-3 px-2 py-1 mb-2">
            <div className="h-9 w-9 rounded-full bg-accent/25 dark:bg-accent/15 border border-accent/40 dark:border-accent/30 flex items-center justify-center text-accent text-xs font-bold uppercase transition-colors duration-200">
              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-semibold text-text-primary truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] text-text-secondary capitalize truncate">
                {user.role}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowLogoutModal(true)}
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-error/10 dark:bg-error/5 border border-error/20 dark:border-error/15 px-3 py-2 text-[11px] font-semibold text-error hover:bg-error/15 dark:hover:bg-error/10 hover:border-error/30 dark:hover:border-error/25 transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>

      <LogoutConfirmModal 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={logout} 
      />
    </aside>
  );
}

