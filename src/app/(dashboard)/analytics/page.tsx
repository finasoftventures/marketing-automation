"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, Share2, RefreshCw, AlertCircle, Wand2, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Post {
  id: string;
  topic: string;
  posted_at: string;
  likes: number;
  comments: number;
  shares: number;
}
interface Summary {
  posts7d: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  fetchedAt: string | null;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, height: 6, background: "var(--muted)", borderRadius: 9999, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 9999, transition: "width 0.5s ease" }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analytics/linkedin");
      const data = await res.json();
      if (data.error && data.error === "not_authenticated") {
        setError("not_authenticated");
      } else if (data.error) {
        setError(data.error);
      } else {
        setPosts(data.posts ?? []);
        setSummary(data.summary ?? null);
      }
    } catch {
      setError("Failed to load analytics");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const maxLikes = Math.max(...posts.map(p => p.likes), 1);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--foreground)" }}>Analytics</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
            Last 7 days — auto-synced every 4 hours
          </p>
        </div>
        <button onClick={load} className="btn-ghost" style={{ fontSize: "0.8125rem" }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Not connected */}
      {!loading && error === "not_authenticated" && (
        <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <AlertCircle size={32} style={{ color: "var(--muted-foreground)", margin: "0 auto 1rem" }} />
          <p style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--foreground)", marginBottom: "0.5rem" }}>
            Connect LinkedIn to see analytics
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>
            Analytics are pulled automatically once you connect your account.
          </p>
          <Link href="/settings/connections" className="btn-primary" style={{ textDecoration: "none" }}>
            Connect LinkedIn
          </Link>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.875rem", marginBottom: "1.5rem" }}>
          {[1,2,3,4].map(i => <div key={i} className="stat-card animate-pulse-soft" style={{ height: 72, background: "var(--muted)" }} />)}
        </div>
      )}

      {/* Real data */}
      {!loading && !error && summary && (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.875rem", marginBottom: "1.5rem" }}>
            {[
              { label: "Posts (7d)", value: summary.posts7d },
              { label: "Reactions", value: summary.totalLikes },
              { label: "Comments", value: summary.totalComments },
              { label: "Reposts", value: summary.totalShares },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.5rem", fontWeight: 500 }}>{s.label}</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--foreground)" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Impressions notice */}
          <div style={{
            padding: "0.875rem 1rem", background: "var(--amber-bg)",
            border: "1px solid var(--amber)", borderRadius: "var(--radius)",
            fontSize: "0.8125rem", color: "#7A5A2A", marginBottom: "1.5rem",
            display: "flex", alignItems: "flex-start", gap: "0.625rem",
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>Impressions not available.</strong> LinkedIn requires Partner API access to fetch impression data. Reactions, comments, and reposts are available without it.
            </span>
          </div>

          {/* Posts table */}
          {posts.length > 0 ? (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--foreground)" }}>Post Performance</h2>
                {summary.fetchedAt && (
                  <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                    Last synced: {new Date(summary.fetchedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                {posts.map((post, i) => (
                  <div key={post.id} style={{
                    display: "flex", alignItems: "center", gap: "1rem",
                    padding: "0.875rem 1.5rem",
                    borderBottom: i < posts.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {post.topic || "LinkedIn Post"}
                      </p>
                      <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", marginTop: "0.125rem" }}>
                        {new Date(post.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flex: 2 }}>
                      <Bar value={post.likes} max={maxLikes} color="#E8C4BE" />
                    </div>
                    <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.8125rem", color: "var(--muted-foreground)", flexShrink: 0, minWidth: 140, justifyContent: "flex-end" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><Heart size={12} /> {post.likes}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><MessageCircle size={12} /> {post.comments}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><Share2 size={12} /> {post.shares}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1.25rem" }}>
                No posts in the last 7 days. Create your first post in the Studio.
              </p>
              <Link href="/studio" className="btn-primary" style={{ textDecoration: "none" }}>
                <Wand2 size={14} /> Open Studio
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
