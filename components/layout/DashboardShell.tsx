"use client";

import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import AuthGuard from "@/components/auth/AuthGuard";
import { usePathname } from "next/navigation";

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/auth/super-admin/login"];
  const isPublic = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + "/"));

  if (!mounted) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  // Pure login pages don't need sidebar/topbar
  if (isPublic) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <div className="flex min-h-screen bg-background">
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
