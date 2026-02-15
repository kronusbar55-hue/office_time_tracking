"use client";

import { useState, useEffect } from "react";
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
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Create floating particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'login-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.setProperty('--duration', (Math.random() * 10 + 10) + 's');
      particle.style.setProperty('--delay', Math.random() * 5 + 's');
      document.body.appendChild(particle);
    }

    return () => {
      document.querySelectorAll('.login-particle').forEach(p => p.remove());
    };
  }, []);

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
      } catch { }

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

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <style>{`
        :root {
          --primary: #0066FF;
          --primary-dark: #0052CC;
          --primary-light: #338FFF;
          --accent: #00D4AA;
          --bg-main: #0A0F1C;
          --bg-card: #141B2E;
          --bg-input: #1A2238;
          --text-primary: #FFFFFF;
          --text-secondary: #A0AEC0;
          --text-muted: #64748B;
          --border: #2D3748;
          --error: #FF4757;
          --success: #00D4AA;
        }

        .login-container {
          font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
          background: var(--bg-main);
          color: var(--text-primary);
          min-height: 100vh;
          overflow-x: hidden;
          position: relative;
        }

        .login-container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            radial-gradient(circle at 20% 30%, rgba(0, 102, 255, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(0, 212, 170, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(0, 102, 255, 0.05) 0%, transparent 70%);
          animation: bgShift 20s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes bgShift {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(2deg); }
        }

        .login-particle {
          position: fixed;
          width: 2px;
          height: 2px;
          background: rgba(0, 102, 255, 0.3);
          border-radius: 50%;
          pointer-events: none;
          animation: float var(--duration) linear var(--delay) infinite;
        }

        @keyframes float {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) scale(1);
            opacity: 0;
          }
        }

        .login-content {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          z-index: 1;
        }

        .login-wrapper {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
          max-width: 500px;
          width: 100%;
          opacity: 0;
          animation: fadeInUp 0.8s ease-out 0.2s forwards;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-card {
          background: var(--bg-card);
          border-radius: 24px;
          padding: 3rem;
          border: 1px solid var(--border);
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(20px);
        }

        .login-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--primary), var(--accent));
          opacity: 0.8;
        }

        .logo-section {
          text-align: center;
          margin-bottom: 2.5rem;
          animation: fadeIn 0.8s ease-out 0.4s backwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .logo {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .logo-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Urbanist', sans-serif;
          font-weight: 700;
          font-size: 24px;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .logo-icon::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }

        .logo-text {
          font-family: 'Urbanist', sans-serif;
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--text-primary), var(--primary-light));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .welcome-text {
          margin-bottom: 2rem;
          animation: fadeIn 0.8s ease-out 0.5s backwards;
        }

        .welcome-text h1 {
          font-family: 'Urbanist', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }

        .welcome-text p {
          color: var(--text-secondary);
          font-size: 1rem;
          margin: 0;
        }

        .form-group {
          margin-bottom: 1.5rem;
          animation: fadeIn 0.8s ease-out backwards;
        }

        .form-group:nth-child(1) { animation-delay: 0.7s; }
        .form-group:nth-child(2) { animation-delay: 0.8s; }
        .form-group:nth-child(3) { animation-delay: 0.9s; }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: var(--text-secondary);
          font-size: 0.875rem;
          transition: color 0.3s ease;
        }

        .input-wrapper {
          position: relative;
        }

        .form-group input {
          width: 100%;
          padding: 0.875rem 1rem;
          background: var(--bg-input);
          border: 2px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 1rem;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.3s ease;
          outline: none;
          box-sizing: border-box;
        }

        .form-group input:focus {
          border-color: var(--primary);
          background: rgba(0, 102, 255, 0.05);
          box-shadow: 0 0 0 4px rgba(0, 102, 255, 0.1);
        }

        .form-group input::placeholder {
          color: var(--text-muted);
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.25rem;
          transition: color 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .password-toggle:hover {
          color: var(--text-secondary);
        }

        .form-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          animation: fadeIn 0.8s ease-out 1s backwards;
        }

        .error-message {
          color: var(--error);
          font-size: 0.875rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 71, 87, 0.1);
          border: 1px solid var(--error);
          border-radius: 8px;
          margin-bottom: 1.5rem;
          animation: fadeInUp 0.3s ease-out;
        }

        .submit-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          margin-bottom: 1.5rem;
          animation: fadeIn 0.8s ease-out 1.1s backwards;
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .submit-btn:hover:not(:disabled)::before {
          left: 100%;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 102, 255, 0.4);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .submit-btn.loading::after {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          border: 2px solid white;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }

        @keyframes spin {
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @media (max-width: 768px) {
          .login-content {
            padding: 1rem;
          }

          .login-card {
            padding: 2rem 1.5rem;
          }

          .welcome-text h1 {
            font-size: 1.75rem;
          }

          .logo-text {
            font-size: 28px;
          }
        }
      `}</style>

      <div className="login-container">
        <div className="login-content">
          <div className="login-wrapper">
            <div className="login-card">
              <div className="logo-section">
                <div className="logo">
                  <div className="logo-icon">T</div>
                  <span className="logo-text">Technotoil</span>
                </div>
              </div>

              <div className="welcome-text">
                <h1>Welcome back</h1>
                <p>Sign in to your account to continue</p>
              </div>

              {error && (
                <div className="error-message">{error}</div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={togglePassword}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* <div className="form-footer">
                  <a href="/forgot-password" className="text-sm font-medium" style={{ color: 'var(--primary)', textDecoration: 'none', transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-light)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary)'}>Forgot password?</a>
                </div> */}

                <button
                  type="submit"
                  disabled={loading}
                  className={`submit-btn ${loading ? 'loading' : ''}`}
                >
                  {loading ? '' : 'Sign in'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

