"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Linkedin, Youtube, RefreshCw, CheckCircle, AlertCircle, Clock, ExternalLink } from "lucide-react";

interface PlatformStatus {
  connected: boolean;
  accountName?: string;
  channelTitle?: string;
  profilePicture?: string;
  expiresAt?: string;
  status?: string;
}

interface Connections {
  linkedin: PlatformStatus;
  youtube: PlatformStatus;
}

function daysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ expiresAt, platform }: { expiresAt?: string; platform?: string }) {
  if (!expiresAt) return null;
  if (platform === "youtube") {
    return <span className="text-xs" style={{ color: "#6B7280" }}>Auto-refreshes</span>;
  }
  const days = daysUntil(expiresAt);
  if (days < 0) return <span className="text-xs text-red-500 font-medium">Token expired — reconnect</span>;
  if (days === 0) return <span className="text-xs font-medium" style={{ color: "#B45309" }}>Expires today</span>;
  if (days < 14) return <span className="text-xs font-medium" style={{ color: "#B45309" }}>Expires in {days} days</span>;
  return <span className="text-xs" style={{ color: "#6B7280" }}>Expires in {days} days</span>;
}

function PlatformCard({
  platform,
  icon: Icon,
  iconColor,
  label,
  status,
  features,
  connectHref,
  onDisconnect,
  disconnecting,
}: {
  platform: string;
  icon: any;
  iconColor: string;
  label: string;
  status: PlatformStatus;
  features: string[];
  connectHref: string;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <Icon size={20} style={{ color: iconColor }} />
          <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--foreground)" }}>{label}</span>
        </div>
        {status.connected ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "0.375rem",
            fontSize: "0.75rem", fontWeight: 500, color: "#16A34A",
            background: "rgba(22,163,74,0.08)", padding: "0.25rem 0.625rem",
            borderRadius: "9999px",
          }}>
            <CheckCircle size={11} /> Connected
          </span>
        ) : (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "0.375rem",
            fontSize: "0.75rem", fontWeight: 500, color: "#9A8F87",
            background: "#F3F0EC", padding: "0.25rem 0.625rem",
            borderRadius: "9999px",
          }}>
            Not connected
          </span>
        )}
      </div>

      {/* Connected body */}
      {status.connected ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            {status.profilePicture && (
              <img src={status.profilePicture} alt="" style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border)" }} />
            )}
            <div>
              <p style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--foreground)" }}>
                {status.channelTitle ?? status.accountName ?? "Account"}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.125rem" }}>
                <Clock size={11} style={{ color: "var(--muted-foreground)" }} />
                <ExpiryBadge expiresAt={status.expiresAt} platform={platform} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.625rem" }}>
            {platform !== "youtube" && (
                <a href={connectHref} style={{
                  fontSize: "0.8125rem", fontWeight: 500, color: "var(--muted-foreground)",
                  border: "1px solid var(--border)", borderRadius: "var(--radius)",
                  padding: "0.375rem 0.75rem", textDecoration: "none",
                  transition: "all 0.15s",
                }}>
                  Reconnect
                </a>
            )}
            <button
              onClick={onDisconnect}
              disabled={disconnecting}
              style={{
                fontSize: "0.8125rem", fontWeight: 500, color: "#DC2626",
                border: "1px solid rgba(220,38,38,0.2)", borderRadius: "var(--radius)",
                padding: "0.375rem 0.75rem", background: "transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {features.map(f => (
              <li key={f} style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                — {f}
              </li>
            ))}
          </ul>
          {platform === "youtube" ? (
              <a href="/api/auth/youtube" style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                background: "#FF0000", color: "#FFFFFF", fontWeight: 500,
                fontSize: "0.875rem", padding: "0.625rem 1.25rem", borderRadius: "var(--radius)",
                textDecoration: "none", transition: "opacity 0.15s",
              }}>
                Connect YouTube
                <ExternalLink size={13} />
              </a>
          ) : (
              <a href={connectHref} style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                background: "var(--foreground)", color: "#FFFFFF", fontWeight: 500,
                fontSize: "0.875rem", padding: "0.625rem 1.25rem", borderRadius: "var(--radius)",
                textDecoration: "none", transition: "opacity 0.15s",
              }}>
                Connect {label}
                <ExternalLink size={13} />
              </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connections | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<"linkedin" | "youtube" | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/settings/connections")
      .then(r => r.json())
      .then(d => setConnections(d))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // Show toast on connect success
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    if (connected) {
      window.history.replaceState({}, "", "/settings/connections");
    }
  }, [load]);

  const handleDisconnect = async (platform: "linkedin" | "youtube") => {
    if (!confirm(`Disconnect ${platform}? You can reconnect anytime.`)) return;
    setDisconnecting(platform);
    await fetch(`/api/settings/connections?platform=${platform}`, { method: "DELETE" });
    setDisconnecting(null);
    load();
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ height: 28, background: "#F3F0EC", borderRadius: 6, width: 200, marginBottom: "2rem" }} className="animate-pulse-soft" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          {[1, 2].map(i => (
            <div key={i} className="card" style={{ height: 200, background: "#F3F0EC" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!connections) return null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }} className="animate-fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.375rem" }}>
          Connected Platforms
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          Connect your accounts so AutoPilot can publish on your behalf.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <PlatformCard
          platform="linkedin"
          icon={Linkedin}
          iconColor="#0A66C2"
          label="LinkedIn"
          status={connections.linkedin}
          features={["Post text and images", "Auto-publish on schedule", "Analytics sync every 4 hours"]}
          connectHref="/api/auth/linkedin"
          onDisconnect={() => handleDisconnect("linkedin")}
          disconnecting={disconnecting === "linkedin"}
        />
        <PlatformCard
          platform="youtube"
          icon={Youtube}
          iconColor="#FF0000"
          label="YouTube"
          status={connections.youtube}
          features={["Upload AI-generated videos", "AI-written titles and descriptions", "Auto SEO tags"]}
          connectHref="/api/auth/youtube"
          onDisconnect={() => handleDisconnect("youtube")}
          disconnecting={disconnecting === "youtube"}
        />
      </div>

      {/* Security note */}
      <div style={{
        padding: "0.875rem 1rem",
        background: "#F9F7F4",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        display: "flex", alignItems: "flex-start", gap: "0.625rem",
      }}>
        <AlertCircle size={14} style={{ color: "var(--muted-foreground)", marginTop: 1, flexShrink: 0 }} />
        <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
          Credentials are stored securely per account and are only used to post on your behalf. We never store your password.
        </p>
      </div>
    </div>
  );
}
