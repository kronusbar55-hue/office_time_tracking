"use client";

import { PLATFORM_SUPER_ADMIN } from "@/lib/platform";

export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
          Platform <span className="text-accent underline decoration-accent/30">Settings</span>
        </h1>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          Seeded control-plane account and production defaults
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/30 p-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Default Super Admin</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Email</p>
            <p className="mt-2 text-sm font-black text-white">{PLATFORM_SUPER_ADMIN.email}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Password</p>
            <p className="mt-2 text-sm font-black text-white">{PLATFORM_SUPER_ADMIN.password}</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          This account is automatically upserted by the platform auth flow so the control plane remains recoverable across environments.
        </p>
      </div>
    </div>
  );
}
