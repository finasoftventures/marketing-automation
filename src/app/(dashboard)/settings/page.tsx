"use client";

import { useEffect, useState } from "react";
import { Link2, Save, RefreshCw } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function SettingsPage() {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [postingTime, setPostingTime] = useState("08:00");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [notifEmail, setNotifEmail] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("brand_profile")
        .select("posting_time, timezone, notification_email")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setPostingTime(data.posting_time ?? "08:00");
        setTimezone(data.timezone ?? "Asia/Kolkata");
        setNotifEmail(data.notification_email ?? true);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from("brand_profile").upsert({
      user_id: user.id,
      posting_time: postingTime,
      timezone,
      notification_email: notifEmail,
    }, { onConflict: "user_id" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }} className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--foreground)" }}>Settings</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
            Manage your account preferences
          </p>
        </div>
        <button onClick={handleSave} disabled={saving || loading} className="btn-primary" style={{ fontSize: "0.875rem" }}>
          {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving...</> : <><Save size={13} /> {saved ? "Saved" : "Save"}</>}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Connected platforms */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Link2 size={15} style={{ color: "var(--muted-foreground)" }} />
              <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--foreground)" }}>Connected platforms</h2>
            </div>
            <Link href="/settings/connections" className="btn-ghost" style={{ fontSize: "0.8125rem" }}>
              Manage
            </Link>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
            Connect LinkedIn and YouTube to publish content automatically.
          </p>
        </div>

        {/* Posting time */}
        <div className="card">
          <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "1rem" }}>Default posting time</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="label">Time</label>
              <input
                type="time" value={postingTime}
                onChange={e => setPostingTime(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className="input-field">
                <option value="Asia/Kolkata">IST (UTC+5:30)</option>
                <option value="America/New_York">EST (UTC-5)</option>
                <option value="America/Los_Angeles">PST (UTC-8)</option>
                <option value="Europe/London">GMT (UTC+0)</option>
                <option value="Europe/Paris">CET (UTC+1)</option>
                <option value="Asia/Dubai">GST (UTC+4)</option>
                <option value="Asia/Singapore">SGT (UTC+8)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "1rem" }}>Notifications</h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.25rem" }}>
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)" }}>Email notifications</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", marginTop: "0.125rem" }}>Get notified when posts publish or fail</p>
            </div>
            <button
              onClick={() => setNotifEmail(!notifEmail)}
              style={{
                width: 40, height: 22, borderRadius: 11, position: "relative",
                background: notifEmail ? "var(--primary)" : "var(--border)",
                border: "none", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: "50%", background: "white",
                position: "absolute", top: 3, transition: "left 0.2s",
                left: notifEmail ? 21 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>
        </div>

        {/* Profile */}
        <div className="card" style={{ background: "var(--muted)" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", lineHeight: 1.6 }}>
            To update your AI persona and niche description, go to{" "}
            <Link href="/brand" style={{ color: "var(--foreground)", fontWeight: 500, textDecoration: "underline" }}>
              Profile
            </Link>
            . These settings impact how the AI writes your posts.
          </p>
        </div>
      </div>
    </div>
  );
}
