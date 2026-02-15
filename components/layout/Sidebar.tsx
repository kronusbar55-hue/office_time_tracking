"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Clock3, LayoutDashboard, CalendarCheck, FileSpreadsheet, BarChart3, Code, UserSquare2, ListChecks, Megaphone, Users, Settings, CalendarDays } from "lucide-react";
import { NAV_CONFIG, ROLES } from "@/lib/roles";
import { LogOut } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon?: any;
};

const ICON_MAP: Record<string, any> = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  time: <Clock3 className="h-4 w-4" />,
  calendar: <CalendarDays className="h-4 w-4" />,
  timesheets: <FileSpreadsheet className="h-4 w-4" />,
  reports: <BarChart3 className="h-4 w-4" />,
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
  const pathname = usePathname();

  const role = user?.role ?? null;
  const navItems = isAuthenticated ? NAV_CONFIG.filter((n) => {
    if (!role) return false;
    return n.allowed.includes(role as any);
  }) : [];

  if (!isAuthenticated) return null;

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-800 bg-sidebar/95 px-4 pb-4 pt-6 shadow-2xl shadow-black/60 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-slate-950">
          <Clock3 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">Office Time Tracking</p>
          <p className="text-[11px] text-slate-400">Internal Portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 text-sm">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href} className={`group flex items-center gap-2 rounded-lg px-2 py-2 text-slate-300 transition-colors ${active ? "bg-accent/15 text-accent" : "hover:bg-slate-800/60 hover:text-slate-100"}`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900/40 text-slate-400 group-hover:bg-slate-900/70 group-hover:text-slate-100">
                {ICON_MAP[item.icon || 'dashboard']}
              </span>
              <span className="truncate text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 space-y-3">


        <button
          onClick={logout}
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900/60 border border-slate-800 px-3 py-2 text-[11px] font-semibold text-slate-100 hover:bg-red-950/40 hover:border-red-800 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

