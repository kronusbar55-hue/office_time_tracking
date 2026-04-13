"use client";

import React, { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();

  const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/auth/super-admin/login"];
  function isPublicRoute(p?: string | null) {
    if (!p) return false;
    return PUBLIC_ROUTES.some((r) => p === r || p.startsWith(r + "/"));
  }

  useEffect(() => {
    if (isPublicRoute(pathname)) return; // don't redirect when on public pages
    if (!loading && !isAuthenticated) {
      // redirect to login if loading completed and no session
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router, pathname]);

  // if this is a public route, allow rendering children immediately
  // this prevents hydration mismatch and avoids flickering on login pages
  if (isPublicRoute(pathname)) return <>{children}</>;

  // while checking session, render a non-blocking skeleton/shell
  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-border-color dark:bg-bg-secondary/40" />
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-border-color dark:bg-bg-secondary/40" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-border-color dark:bg-bg-secondary/40" />
          <div className="h-64 w-full animate-pulse rounded bg-border-color dark:bg-bg-secondary/40" />
        </div>
      </div>
    );
  }

  // if authenticated, render children
  if (isAuthenticated) return <>{children}</>;

  // otherwise null while redirect happens
  return null;
}

export default AuthGuard;
