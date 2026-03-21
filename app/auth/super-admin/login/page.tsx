"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Shield, Lock, Mail, Loader2 } from "lucide-react";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      toast.success("Welcome, Super Admin");
      router.push("/super-admin/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 text-accent outline outline-1 outline-accent/30 shadow-[0_0_30px_rgba(var(--accent-rgb),0.2)]">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Platform <span className="text-accent underline decoration-accent/30">Control</span></h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 italic">Super Admin Access Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Master Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-black/50 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/40"
                placeholder="admin.pk@technotoil.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Master Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-black/50 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/40"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize Access"}
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
          Secure Multi-Tenant Infrastructure v1.0
        </div>
      </div>
    </div>
  );
}
