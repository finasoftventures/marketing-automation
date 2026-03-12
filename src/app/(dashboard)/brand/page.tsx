"use client";

import { useEffect, useState } from "react";
import { Save, RefreshCw, User, Target, Pen, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function BrandPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Core identity
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [niche, setNiche] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Voice & audience
  const [writingStyle, setWritingStyle] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [contentGoals, setContentGoals] = useState("");
  const [avoidTopics, setAvoidTopics] = useState("");

  // Writing samples
  const [sample1, setSample1] = useState("");
  const [sample2, setSample2] = useState("");
  const [sample3, setSample3] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("full_name, persona, niche_description, linkedin_url, writing_style, target_audience, content_goals, avoid_topics, writing_sample_1, writing_sample_2, writing_sample_3")
        .eq("id", user.id)
        .single();
      if (data) {
        setName(data.full_name ?? "");
        setPersona(data.persona ?? "");
        setNiche(data.niche_description ?? "");
        setLinkedinUrl(data.linkedin_url ?? "");
        setWritingStyle(data.writing_style ?? "");
        setTargetAudience(data.target_audience ?? "");
        setContentGoals(data.content_goals ?? "");
        setAvoidTopics(data.avoid_topics ?? "");
        setSample1(data.writing_sample_1 ?? "");
        setSample2(data.writing_sample_2 ?? "");
        setSample3(data.writing_sample_3 ?? "");
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in"); setSaving(false); return; }
    const { error: err } = await supabase
      .from("users")
      .update({
        full_name: name,
        persona,
        niche_description: niche,
        linkedin_url: linkedinUrl,
        writing_style: writingStyle,
        target_audience: targetAudience,
        content_goals: contentGoals,
        avoid_topics: avoidTopics,
        writing_sample_1: sample1,
        writing_sample_2: sample2,
        writing_sample_3: sample3,
      })
      .eq("id", user.id);
    if (err) setError(err.message);
    else { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ height: 28, background: "var(--muted)", borderRadius: 6, width: 200, marginBottom: "2rem" }} className="animate-pulse-soft" />
        {[1, 2, 3, 4].map(i => <div key={i} className="card animate-pulse-soft" style={{ height: 120, marginBottom: "1rem", background: "var(--muted)" }} />)}
      </div>
    );
  }

  const SectionHeader = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
        {icon}
      </div>
      <div>
        <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--foreground)" }}>{title}</h2>
        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.125rem" }}>{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }} className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--foreground)" }}>AI Voice Profile</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
            The more detail you add, the better the AI writes in your exact voice.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ fontSize: "0.875rem" }}>
          {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving...</> : <><Save size={13} /> {saved ? "✓ Saved" : "Save"}</>}
        </button>
      </div>

      {error && (
        <div style={{ padding: "0.75rem 1rem", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "var(--radius)", marginBottom: "1rem", fontSize: "0.8125rem", color: "#DC2626" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* ── Section 1: Identity ── */}
        <div className="card">
          <SectionHeader
            icon={<User size={15} style={{ color: "var(--muted-foreground)" }} />}
            title="Your Identity"
            subtitle="Basic information the AI uses to personalize every post"
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label className="label">Your name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="e.g. Rahul Sharma" />
            </div>
            <div>
              <label className="label">LinkedIn Profile URL</label>
              <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} className="input-field" placeholder="https://linkedin.com/in/yourhandle" />
            </div>
          </div>
          <div>
            <label className="label">Who you are <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(role, background, story)</span></label>
            <textarea
              value={persona} onChange={e => setPersona(e.target.value)}
              className="input-field" rows={3} style={{ resize: "vertical" }}
              placeholder="e.g. I'm a 2x startup founder currently building an AI SaaS for enterprise sales teams. Previously raised a $4M seed round. I write from hard-earned experience, not theory."
            />
          </div>
        </div>

        {/* ── Section 2: Content Strategy ── */}
        <div className="card">
          <SectionHeader
            icon={<Target size={15} style={{ color: "var(--muted-foreground)" }} />}
            title="Content Strategy"
            subtitle="What you post about, who reads it, and why"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="label">Niche / Topics you cover</label>
              <textarea
                value={niche} onChange={e => setNiche(e.target.value)}
                className="input-field" rows={2} style={{ resize: "vertical" }}
                placeholder="e.g. B2B SaaS, startup fundraising, founder mindset, AI tools for enterprise, product-led growth"
              />
              <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.375rem" }}>
                AI scouts news from these areas every time you generate a post
              </p>
            </div>
            <div>
              <label className="label">Target audience <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(who reads your posts)</span></label>
              <input
                type="text" value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
                className="input-field"
                placeholder="e.g. Series A/B founders, VCs, B2B SaaS operators, enterprise IT buyers"
              />
            </div>
            <div>
              <label className="label">Content goals <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(why you post)</span></label>
              <input
                type="text" value={contentGoals} onChange={e => setContentGoals(e.target.value)}
                className="input-field"
                placeholder="e.g. Build thought leadership, attract inbound enterprise leads, grow LinkedIn following to 10k"
              />
            </div>
            <div>
              <label className="label">Topics to <strong>never</strong> post about</label>
              <input
                type="text" value={avoidTopics} onChange={e => setAvoidTopics(e.target.value)}
                className="input-field"
                placeholder="e.g. Politics, crypto/web3, consumer apps, personal life, salary discussions"
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Writing Voice ── */}
        <div className="card">
          <SectionHeader
            icon={<Pen size={15} style={{ color: "var(--muted-foreground)" }} />}
            title="Your Writing Voice"
            subtitle="How you write — AI mimics this exactly"
          />
          <label className="label">Describe your writing style</label>
          <textarea
            value={writingStyle} onChange={e => setWritingStyle(e.target.value)}
            className="input-field" rows={3} style={{ resize: "vertical" }}
            placeholder="e.g. Direct and confident, slightly contrarian. I use short sentences. I like data and specific numbers. I don't use corporate jargon. I sometimes use self-deprecating humor. I write like I'm talking to one person, not a crowd."
          />
          <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.375rem" }}>
            The more specific, the better. Describe sentence length, tone, vocabulary, humor level, etc.
          </p>
        </div>

        {/* ── Section 4: Writing Samples ── */}
        <div className="card">
          <SectionHeader
            icon={<BookOpen size={15} style={{ color: "var(--muted-foreground)" }} />}
            title="Writing Samples"
            subtitle="Paste up to 3 of your best LinkedIn posts — AI learns your exact voice from these"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { label: "Best post #1", value: sample1, onChange: setSample1, placeholder: "Paste your best-performing LinkedIn post here..." },
              { label: "Best post #2", value: sample2, onChange: setSample2, placeholder: "Paste another strong post..." },
              { label: "Best post #3 (optional)", value: sample3, onChange: setSample3, placeholder: "One more if you have it..." },
            ].map((s, i) => (
              <div key={i}>
                <label className="label">{s.label}</label>
                <textarea
                  value={s.value} onChange={e => s.onChange(e.target.value)}
                  className="input-field" rows={4} style={{ resize: "vertical", fontFamily: "inherit" }}
                  placeholder={s.placeholder}
                />
                {s.value && (
                  <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                    {s.value.split(/\s+/).filter(Boolean).length} words
                  </p>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "var(--muted)", borderRadius: "var(--radius)", fontSize: "0.8125rem", color: "var(--muted-foreground)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--foreground)" }}>How AI uses these:</strong> Each time you generate a post, the AI reads your samples to match your sentence rhythm, vocabulary, hook style, and ending pattern. It learns what makes your posts sound like <em>you</em>, not a generic AI.
          </div>
        </div>

      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving...</> : <><Save size={13} /> {saved ? "✓ Saved" : "Save Profile"}</>}
        </button>
      </div>
    </div>
  );
}
