"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown, Wand2, RefreshCw, CheckCircle, MessageCircle, Heart, Share2 } from "lucide-react";

interface Analytics {
  posts7d: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  fetchedAt: string | null;
}

interface RecentPost {
  id: string;
  topic: string;
  posted_at: string;
  likes: number;
  comments: number;
  shares: number;
}

function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <div className="stat-card">
      <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>{label}</p>
      <p className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: accent }}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [posts, setPosts] = useState<RecentPost[]>([]);
  const [profile, setProfile] = useState<{ name?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [analyticsRes, profileRes] = await Promise.allSettled([
          fetch("/api/analytics/linkedin").then(r => r.json()),
          fetch("/api/linkedin/profile").then(r => r.json()),
        ]);

        if (analyticsRes.status === "fulfilled") {
          setAnalytics(analyticsRes.value.summary ?? null);
          setPosts(analyticsRes.value.posts ?? []);
        }
        if (profileRes.status === "fulfilled" && !profileRes.value.error) {
          setProfile(profileRes.value);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--foreground)" }}>
            {greeting}{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/studio" style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          background: "var(--foreground)", color: "#fff",
          padding: "0.625rem 1.25rem", borderRadius: "var(--radius)",
          fontSize: "0.875rem", fontWeight: 500, textDecoration: "none",
          transition: "opacity 0.15s",
        }}>
          <Wand2 size={15} /> New Post
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.875rem", marginBottom: "1.5rem" }}>
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card animate-pulse-soft" style={{ height: 72, background: "#F3F0EC" }} />
          ))
        ) : (
          <>
            <StatCard label="Posts (7 days)" value={analytics?.posts7d ?? 0} sub="LinkedIn" accent="#A8C4A0" />
            <StatCard label="Reactions" value={analytics?.totalLikes ?? 0} sub="Auto-synced" accent="#0A66C2" />
            <StatCard label="Comments" value={analytics?.totalComments ?? 0} sub="Auto-synced" accent="#B45309" />
            <StatCard label="Reposts" value={analytics?.totalShares ?? 0} sub="Auto-synced" accent="#7C3AED" />
          </>
        )}
      </div>

      {/* Two column */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>

        {/* Recent Posts */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--foreground)" }}>Recent Posts</h2>
            <span style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)" }}>
              {analytics?.fetchedAt
                ? `Synced ${new Date(analytics.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Not synced yet"}
            </span>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 48, background: "#F3F0EC", borderRadius: 8 }} className="animate-pulse-soft" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
                No posts in the last 7 days.
              </p>
              <Link href="/studio" style={{
                fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)",
                textDecoration: "none",
              }}>
                Create your first post
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {posts.slice(0, 5).map((post, i) => (
                <div key={post.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.625rem 0",
                  borderBottom: i < posts.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {post.topic || "LinkedIn Post"}
                    </p>
                    <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)" }}>
                      {new Date(post.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.875rem", fontSize: "0.6875rem", color: "var(--muted-foreground)", flexShrink: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Heart size={11} /> {post.likes}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <MessageCircle size={11} /> {post.comments}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && (
            <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", marginTop: "0.75rem", lineHeight: 1.5 }}>
              Reactions, comments, and reposts are auto-synced every 4 hours from LinkedIn. Impressions require LinkedIn Partner access.
            </p>
          )}
        </div>

        {/* Launch Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card" style={{ background: "#F9F7F4" }}>
            <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.5rem" }}>
              Content Studio
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              AI writes your post, generates an image, creates a Veo 3.1 video, then publishes to LinkedIn and YouTube.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
              {["Text — AI scouts news and writes your post", "Image — Imagen 3 generates a visual", "Video — Veo 3.1 creates an 8-second video", "Publish — LinkedIn + YouTube in one click"].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", background: "var(--foreground)",
                    color: "#fff", fontSize: "0.625rem", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--foreground)" }}>{step}</p>
                </div>
              ))}
            </div>
            <Link href="/studio" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              background: "var(--foreground)", color: "#fff",
              padding: "0.75rem", borderRadius: "var(--radius)",
              fontSize: "0.875rem", fontWeight: 500, textDecoration: "none",
            }}>
              <Wand2 size={15} /> Open Studio
            </Link>
          </div>

          <div className="card">
            <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.5rem" }}>
              Platform Connections
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
              Connect LinkedIn and YouTube to start publishing.
            </p>
            <Link href="/settings/connections" style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              fontSize: "0.8125rem", fontWeight: 500, color: "var(--foreground)",
              textDecoration: "none", border: "1px solid var(--border)",
              padding: "0.5rem 0.875rem", borderRadius: "var(--radius)",
              width: "fit-content",
            }}>
              Manage Connections <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
