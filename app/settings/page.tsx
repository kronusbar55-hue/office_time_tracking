"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function SettingsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadSessions() {
    try {
      const res = await fetch("/api/auth/sessions");
      const data = await res.json();
      if (data.success) {
        setSessions(data.data || []);
      }
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (!password || password !== confirmPassword) {
      toast.error("Passwords must match");
      return;
    }

    setSaving(true);
    try {
      const me = await fetch("/api/auth/me");
      const meData = await me.json();
      const email = meData?.user?.email;
      if (!email) throw new Error("Unable to resolve current user");

      const forgotRes = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const forgotData = await forgotRes.json();
      const token = forgotData?.data?.resetToken;
      if (!token) throw new Error("Failed to generate reset token");

      const resetRes = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const resetData = await resetRes.json();
      if (!resetRes.ok) throw new Error(resetData?.message || "Password update failed");

      toast.success("Password updated");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Password update failed");
    } finally {
      setSaving(false);
    }
  }

  async function revokeCurrentSession() {
    try {
      const res = await fetch("/api/auth/sessions", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to revoke session");
      toast.success("Current session revoked");
      window.location.href = "/login";
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke session");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-sm font-semibold text-text-primary">Settings</h1>
        <p className="text-xs text-text-secondary">
          Manage password security and active login sessions for your organization account.
        </p>
      </div>

      <section className="rounded-xl border border-border-color bg-card/70 p-4 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Reset password</h2>
        <form onSubmit={(e) => void handlePasswordReset(e)} className="mt-4 grid gap-3 md:max-w-xl">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="h-10 rounded-md border border-border-color bg-bg-primary/60 px-3 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="h-10 rounded-md border border-border-color bg-bg-primary/60 px-3 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border-color bg-card/70 p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Session management</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Review your active login sessions and revoke the current device when needed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void revokeCurrentSession()}
            className="rounded-md border border-rose-700/70 px-3 py-2 text-xs text-rose-300 hover:border-rose-400 hover:text-rose-200"
          >
            Revoke current session
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-border-color/80 bg-bg-primary/40">
          <table className="min-w-full text-left text-[11px]">
            <thead className="bg-bg-secondary/60 text-text-secondary">
              <tr>
                <th className="px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">User agent</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-text-secondary">Loading sessions...</td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-text-secondary">No active sessions found.</td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="border-t border-border-color/70 text-text-primary">
                    <td className="px-3 py-2">{session.ipAddress || "Unknown"}</td>
                    <td className="px-3 py-2">{session.userAgent || "Unknown device"}</td>
                    <td className="px-3 py-2">{new Date(session.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{new Date(session.expiresAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

