"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "react-toastify";

export default function SuperAdminLoginPage() {
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
      
      if (body?.data?.user?.role !== "super-admin") {
        throw new Error("Access denied. Not a super-admin account.");
      }

      setAuth("local_auth", body?.data?.user ?? null);
      toast.success("Super Admin login successful!");
      router.replace("/auth/super-admin/admins");
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unable to sign in. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
      <style>{`
        .super-admin-card {
          background: #141B2E;
          border: 1px solid #2D3748;
          border-radius: 24px;
          padding: 3rem;
          width: 100%;
          max-width: 450px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          position: relative;
          overflow: hidden;
        }
        .super-admin-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, #6366F1, #A855F7);
        }
        .logo-text {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #FFF, #A0AEC0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-align: center;
          margin-bottom: 0.5rem;
        }
        .subtitle {
          color: #A0AEC0;
          text-align: center;
          margin-bottom: 2.5rem;
          font-size: 0.9rem;
        }
        .input-group {
          margin-bottom: 1.5rem;
        }
        .input-group label {
          display: block;
          color: #A0AEC0;
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
        }
        .input-group input {
          width: 100%;
          background: #1A2238;
          border: 1px solid #2D3748;
          border-radius: 12px;
          padding: 0.8rem 1rem;
          color: white;
          outline: none;
          transition: border-color 0.3s;
        }
        .input-group input:focus {
          border-color: #6366F1;
        }
        .login-btn {
          width: 100%;
          background: linear-gradient(135deg, #6366F1, #4F46E5);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
        }
        .error-box {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #EF4444;
          color: #EF4444;
          padding: 0.8rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-size: 0.85rem;
        }
      `}</style>

      <div className="super-admin-card">
        <div className="logo-text">Super Portal</div>
        <div className="subtitle">Enterprise Administration Access</div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Master Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="super@admin.com"
              required
            />
          </div>
          <div className="input-group">
            <label>Passcode</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "Authenticating..." : "Establish Connection"}
          </button>
        </form>
      </div>
    </div>
  );
}
