"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import AuthGuard from "@/components/auth/AuthGuard";

interface DashboardShellProps {
  children: ReactNode;
}

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/auth/super-admin/login"];
function isPublicRoute(pathname?: string | null) {
  if (!pathname) return false;
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showShell = mounted && !isPublicRoute(pathname);

  if (!showShell) {
    return (
      <div className="flex min-h-screen bg-bg-primary dark:bg-bg-primary transition-colors duration-200">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto px-6 pb-8 pt-4">
            <AuthGuard>{children}</AuthGuard>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-primary dark:bg-bg-primary transition-colors duration-200">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-6 pb-8 pt-4">
          <AuthGuard>{children}</AuthGuard>
        </main>
      </div>
    </div>
  );
}

