 "use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserSquare2 } from "lucide-react";

type MeUser = {
  firstName: string;
  lastName: string;
  role: "admin" | "manager" | "employee";
};

export function Topbar() {
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [today, setToday] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setToday(format(new Date(), "EEEE, dd MMM yyyy"));
    
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = (await res.json()) as { user: MeUser | null };
        if (data.user) setUser(data.user);
      } catch {
        // ignore
      }
    }

    void fetchMe();
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  if (!mounted) {
    return (
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-header/95 px-4 shadow-lg shadow-black/40">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Overview
          </span>
          <span className="text-xs font-semibold text-slate-100">Loading...</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden flex-col text-right text-[11px] leading-tight sm:flex">
            <span className="font-medium text-slate-100">Not signed in</span>
            <span className="text-slate-400"></span>
          </div>
          <button
            type="button"
            disabled
            className="flex h-8 items-center justify-center rounded-full bg-accent/90 px-3 text-[11px] font-semibold text-slate-950 shadow-md shadow-cyan-500/40 opacity-50"
          >
            <UserSquare2 className="mr-1.5 h-4 w-4" />
            Logout
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-header/95 px-4 shadow-lg shadow-black/40">
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
          Overview
        </span>
        <span className="text-xs font-semibold text-slate-100">{today}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden flex-col text-right text-[11px] leading-tight sm:flex">
          <span className="font-medium text-slate-100">
            {user
              ? `${user.firstName} ${user.lastName}`
              : "Not signed in"}
          </span>
          <span className="text-slate-400">
            {user ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-8 items-center justify-center rounded-full bg-accent/90 px-3 text-[11px] font-semibold text-slate-950 shadow-md shadow-cyan-500/40 hover:bg-cyan-400"
        >
          <UserSquare2 className="mr-1.5 h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}

