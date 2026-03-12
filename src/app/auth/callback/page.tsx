"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handle = async () => {
      // Exchange the code in the URL for a session
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login?error=auth_failed");
        return;
      }

      // Check if user has completed onboarding (has persona set)
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("id", session.user.id)
          .single();

        if (!userData) {
          // Ensure user row exists
          await supabase.from("users").upsert({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name ?? "",
          });
        }

        // YouTube tokens are handled separately via /api/auth/youtube route
        // which uses the service role key to bypass RLS policies.
      } catch { /* non-blocking */ }

      router.replace("/dashboard");
    };

    handle();
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--background)",
    }}>
      <div style={{ textAlign: "center" }} className="animate-fade-in">
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: "var(--foreground)", display: "flex",
          alignItems: "center", justifyContent: "center",
          margin: "0 auto 1rem",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse-soft">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          Signing you in...
        </p>
      </div>
    </div>
  );
}
