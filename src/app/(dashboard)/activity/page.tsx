"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, Share2, ExternalLink, Wand2 } from "lucide-react";
import Link from "next/link";

interface Post {
  id: string;
  topic: string;
  posted_at: string;
  likes: number;
  comments: number;
  shares: number;
}

export default function ActivityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/linkedin")
      .then(r => r.json())
      .then(d => { setPosts(d.posts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }} className="animate-fade-in">
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--foreground)" }}>Activity</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
          Your recent LinkedIn posts and engagement
        </p>
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="animate-pulse-soft" style={{ height: 60, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1.25rem" }}>
            No posts yet. Create your first post through the Studio.
          </p>
          <Link href="/studio" className="btn-primary" style={{ textDecoration: "none" }}>
            <Wand2 size={14} /> Open Studio
          </Link>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {posts.map((post, i) => (
            <div key={post.id} style={{
              display: "flex", alignItems: "center", gap: "1rem",
              padding: "0.875rem 1.5rem",
              borderBottom: i < posts.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--sage)", flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {post.topic || "LinkedIn Post"}
                </p>
                <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", marginTop: "0.125rem" }}>
                  {new Date(post.posted_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </p>
              </div>
              <div style={{ display: "flex", gap: "1rem", fontSize: "0.8125rem", color: "var(--muted-foreground)", flexShrink: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><Heart size={12} /> {post.likes}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><MessageCircle size={12} /> {post.comments}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><Share2 size={12} /> {post.shares}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
