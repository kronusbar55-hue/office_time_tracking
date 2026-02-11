"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "react-toastify";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Invalid credentials");
      }

      const body = await res.json().catch(() => null) as any;
      // server sets httpOnly cookie and returns user in body
      try {
        // set a client-detectable token so AuthProvider will run session fetch
        setAuth("local_auth", body?.data?.user ?? null);
      } catch {}

      toast.success("Login successful!");
      router.replace("/");
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unable to sign in. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const handleOAuth = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <div className="min-h-[calc(100vh-56px)] grid grid-cols-1 md:grid-cols-2">
      <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-500 p-12">
        <div className="max-w-md text-center text-white">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 className="text-3xl font-bold">Track time like a pro.</h2>
          <p className="mt-4 text-sm opacity-90">Join over 10,000 teams managing their time, productivity, and payroll with ChronosTrack.</p>

          <div className="mt-8 grid grid-cols-5 justify-items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-10 rounded-full bg-white/20" />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-400">Enter your credentials to access your dashboard.</p>

          {error && (
            <div className="mt-3 rounded-md border border-rose-700 bg-rose-950/60 px-3 py-2 text-[11px] text-rose-100">{error}</div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
            <div className="space-y-1 text-xs">
              <label className="block font-medium text-slate-400">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100" required />
            </div>

            <div className="space-y-1 text-xs">
              <label className="block font-medium text-slate-400">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100" required />
            </div>

            <button type="submit" disabled={loading} className="mt-2 w-full rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-70">{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>

          {/* <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-800" />
            <div>OR CONTINUE WITH</div>
            <div className="h-px flex-1 bg-slate-800" />
          </div> */}


        </div>
      </div>
    </div>
  );
}

