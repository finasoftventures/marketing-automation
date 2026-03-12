"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [success, setSuccess] = useState("");

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setSuccess("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = "/dashboard";
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { 
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/youtube.upload",
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--background)", padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }} className="animate-fade-in">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "var(--foreground)", display: "flex",
            alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
            AutoPilot
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
            AI-powered social media automation
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "2rem" }}>
          {/* Tab toggle */}
          <div style={{
            display: "flex", background: "var(--muted)", borderRadius: "var(--radius)",
            padding: "0.25rem", marginBottom: "1.5rem",
          }}>
            {(["signin", "signup"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                style={{
                  flex: 1, padding: "0.5rem", borderRadius: "calc(var(--radius) - 2px)",
                  fontSize: "0.875rem", fontWeight: 500, border: "none", cursor: "pointer",
                  transition: "all 0.15s",
                  background: mode === m ? "var(--card)" : "transparent",
                  color: mode === m ? "var(--foreground)" : "var(--muted-foreground)",
                  boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}>
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{
              padding: "0.75rem 1rem", background: "var(--rose-bg)", border: "1px solid var(--rose)",
              borderRadius: "var(--radius)", marginBottom: "1rem",
              fontSize: "0.8125rem", color: "#7A3A2A",
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              padding: "0.75rem 1rem", background: "var(--sage-bg)", border: "1px solid var(--sage)",
              borderRadius: "var(--radius)", marginBottom: "1rem",
              fontSize: "0.8125rem", color: "var(--accent-foreground)",
            }}>
              {success}
            </div>
          )}

          {/* Email form */}
          <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: "0.875rem", marginBottom: "1rem" }}>
            <div>
              <label className="label">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="you@example.com" required autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input-field" placeholder="••••••••" required minLength={8}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "0.25rem" }}>
              {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* Google */}
          <button onClick={handleGoogleSignIn} disabled={googleLoading} className="btn-secondary" style={{ width: "100%" }}>
            {googleLoading ? "Connecting..." : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "1.25rem", lineHeight: 1.5 }}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
