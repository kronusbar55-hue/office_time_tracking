"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UnauthorizedPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user has any auth token - if not, redirect to login
    let hasToken = false;
    try {
      const localToken = localStorage.getItem("ott_auth_token");
      if (localToken) hasToken = true;
    } catch {}

    try {
      if (!hasToken && typeof document !== "undefined") {
        hasToken = document.cookie.split(";").some((c) => c.trim().startsWith("auth_token="));
      }
    } catch {}

    if (!hasToken) {
      // No token at all - redirect to login
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="rounded-xl border border-border-color bg-card/70 p-8 text-center shadow-card">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
        <p className="text-text-secondary mb-6">
          You don&apos;t have permission to access this page.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-border-color bg-bg-secondary/50 px-4 py-2 text-sm text-text-secondary hover:bg-card-bg transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-slate-900 hover:brightness-95 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
