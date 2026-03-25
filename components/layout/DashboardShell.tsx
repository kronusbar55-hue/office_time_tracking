"use client";

import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import AuthGuard from "@/components/auth/AuthGuard";

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return the minimum shell to match the server-side render structure
    // This helps avoid hydration mismatches by keeping the tree depth consistent
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

