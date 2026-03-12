"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle, RefreshCw, AlertCircle, ExternalLink,
  ChevronDown, ChevronUp, ArrowRight, RotateCcw,
  Linkedin, Youtube, LayoutGrid, Layers, ImageIcon
} from "lucide-react";
import { jsPDF } from "jspdf";

type ContentType = "linkedin" | "youtube" | "both" | "carousel";
type CarouselType = "multi-image" | "quote-stats" | "how-to" | "story-arc" | "framework";
type CarouselSlide = { imageB64: string; headline: string; body: string; imagePrompt: string };

// ─── Dynamic Step definitions ─────────────────────────────────────────────────
function getSteps(ct: ContentType) {
  if (ct === "youtube") return [
    { id: 1, label: "Script", description: "AI writes hook" },
    { id: 2, label: "Video",  description: "Veo 3.1 short" },
    { id: 3, label: "Publish", description: "Upload to YouTube" },
  ];
  if (ct === "carousel") return [
    { id: 1, label: "Post",    description: "AI writes post" },
    { id: 2, label: "Slides",  description: "Generate carousel" },
    { id: 3, label: "Publish", description: "Post to LinkedIn" },
  ];
  if (ct === "both") return [
    { id: 1, label: "Post",    description: "AI writes content" },
    { id: 2, label: "Media",   description: "Image + Video parallel" },
    { id: 3, label: "Video",   description: "Veo 3.1 short" },
    { id: 4, label: "Publish", description: "LinkedIn + YouTube" },
  ];
  // linkedin (default)
  return [
    { id: 1, label: "Post",    description: "AI writes post" },
    { id: 2, label: "Image",   description: "Visual generated" },
    { id: 3, label: "Publish", description: "Post to LinkedIn" },
  ];
}

// ─── Content Type Picker ───────────────────────────────────────────────────────
function ContentTypePicker({ onPick }: { onPick: (ct: ContentType) => void }) {
  const types: { id: ContentType; icon: React.ReactNode; label: string; sub: string; color: string }[] = [
    { id: "linkedin",  icon: <Linkedin size={22} />,   label: "LinkedIn Post",       sub: "Text + AI image → LinkedIn",          color: "#0A66C2" },
    { id: "youtube",   icon: <Youtube size={22} />,    label: "YouTube Short",       sub: "Script + Veo video → YouTube",        color: "#FF0000" },
    { id: "both",      icon: <Layers size={22} />,     label: "LinkedIn + YouTube",  sub: "Image & video in parallel → both",   color: "#7C3AED" },
    { id: "carousel",  icon: <LayoutGrid size={22} />, label: "LinkedIn Carousel",   sub: "Multi-slide post → LinkedIn",         color: "#D97706" },
  ];
  return (
    <div>
      <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1.25rem" }}>
        Choose what you want to create today.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {types.map(t => (
          <button key={t.id} onClick={() => onPick(t.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "flex-start",
            gap: "0.5rem", padding: "1rem", borderRadius: "var(--radius)",
            border: "1.5px solid var(--border)", background: "var(--card)",
            cursor: "pointer", textAlign: "left", transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = t.color; (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${t.color}20`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
            <span style={{ color: t.color }}>{t.icon}</span>
            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--foreground)" }}>{t.label}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", lineHeight: 1.4 }}>{t.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step Progress Bar (dynamic) ────────────────────────────────────────────────
function StepBar({ current, contentType }: { current: number; contentType: ContentType }) {
  const STEPS = getSteps(contentType);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: "2rem" }}>
      {STEPS.map((step, idx) => (
        <div key={step.id} style={{ display: "flex", alignItems: "center", flex: idx < STEPS.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", fontWeight: 600,
              background: step.id < current ? "#16A34A" : step.id === current ? "var(--foreground)" : "var(--border)",
              color: step.id <= current ? "#fff" : "var(--muted-foreground)",
              transition: "all 0.3s",
            }}>
              {step.id < current ? <CheckCircle size={14} /> : step.id}
            </div>
            <span style={{
              fontSize: "0.6875rem", fontWeight: step.id === current ? 600 : 400,
              color: step.id === current ? "var(--foreground)" : "var(--muted-foreground)",
              whiteSpace: "nowrap",
            }}>
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 1, margin: "0 0.5rem", marginBottom: "1.1rem",
              background: step.id < current ? "#16A34A" : "var(--border)",
              transition: "background 0.3s",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step Card Wrapper ────────────────────────────────────────────────────────
function StepCard({
  stepNum, current, title, badge, children,
}: {
  stepNum: number; current: number; title: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  const isActive = stepNum === current;
  const isDone = stepNum < current;
  const isLocked = stepNum > current;

  return (
    <div className="card" style={{
      opacity: isLocked ? 0.45 : 1,
      transition: "opacity 0.3s",
      position: "relative",
      overflow: "hidden",
    }}>
      {isLocked && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", background: "rgba(250,250,248,0.7)",
          backdropFilter: "blur(2px)", zIndex: 2,
          flexDirection: "column", gap: "0.5rem",
        }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "1rem" }}>🔒</span>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
            Complete step {stepNum - 1} first
          </p>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--foreground)" }}>{title}</h2>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ─── Pill Badge ───────────────────────────────────────────────────────────────
function Pill({ label, color = "#A8C4A0" }: { label: string; color?: string }) {
  return (
    <span style={{
      fontSize: "0.6875rem", fontWeight: 600, padding: "0.2rem 0.625rem",
      borderRadius: "9999px", background: `${color}25`, color,
      letterSpacing: "0.03em",
    }}>
      {label}
    </span>
  );
}

// ─── Source Pills ─────────────────────────────────────────────────────────────
function SourcePills({ sources }: { sources: { title: string; url: string }[] }) {
  if (!sources.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", fontWeight: 500 }}>Sources:</span>
      {sources.slice(0, 3).map((s, i) => (
        <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{
          fontSize: "0.6875rem", color: "var(--muted-foreground)",
          background: "var(--muted)", border: "1px solid var(--border)",
          borderRadius: "9999px", padding: "0.2rem 0.625rem",
          textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem",
          maxWidth: 180, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
        }}>
          <ExternalLink size={9} />
          {s.title}
        </a>
      ))}
    </div>
  );
}

// ─── Generating Spinner ───────────────────────────────────────────────────────
function GeneratingState({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ padding: "1.5rem 0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {steps.map((label, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            {done ? (
              <CheckCircle size={15} style={{ color: "#16A34A", flexShrink: 0 }} />
            ) : active ? (
              <RefreshCw size={15} className="animate-spin" style={{ color: "var(--foreground)", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 15, height: 15, borderRadius: "50%", background: "var(--border)", flexShrink: 0 }} />
            )}
            <span style={{
              fontSize: "0.875rem",
              color: done ? "#16A34A" : active ? "var(--foreground)" : "var(--muted-foreground)",
              fontWeight: active ? 500 : 400,
            }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════
type NewsStory = {
  title: string;
  summary: string;
  viralityScore: number;
  viralityReason: string;
  angle: string;
  sources: { title: string; url: string }[];
};

type PostDraft = {
  topic: string;
  text: string;
  sources: { title: string; url: string }[];
  score: number; // 1-10 AI-judged engagement score
  scoreReason: string;
};

// ─── Virality Badge ────────────────────────────────────────────────────────────
function ViralityBadge({ score }: { score: number }) {
  const color = score >= 9 ? "#DC2626" : score >= 7 ? "#D97706" : "#16A34A";
  const label = score >= 9 ? "🔥 Viral" : score >= 7 ? "⚡ Strong" : "✓ Good";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
      <span style={{
        fontSize: "0.6875rem", fontWeight: 700, padding: "0.2rem 0.625rem",
        borderRadius: "9999px", background: `${color}18`, color, border: `1px solid ${color}40`,
        letterSpacing: "0.04em",
      }}>{label} {score}/10</span>
    </div>
  );
}

// ─── Story Card ────────────────────────────────────────────────────────────────
function StoryCard({
  story, idx, onPick, onPickAll, isWritingThis, isWritingAll,
}: {
  story: NewsStory; idx: number;
  onPick: () => void; onPickAll: () => void;
  isWritingThis: boolean; isWritingAll: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: "var(--radius)",
      padding: "1rem", background: "var(--card)",
      transition: "border-color 0.2s, box-shadow 0.2s",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--foreground)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.625rem" }}>
        <span style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", fontWeight: 500 }}>#{idx + 1}</span>
        <ViralityBadge score={story.viralityScore} />
      </div>
      {/* Title */}
      <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.4, marginBottom: "0.5rem" }}>
        {story.title}
      </h3>
      {/* Summary */}
      <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "0.625rem" }}>
        {story.summary}
      </p>
      {/* Expand details */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: expanded ? "0.75rem" : "0" }}
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? "Less detail" : "Why it works + best angle"}
      </button>
      {expanded && (
        <div style={{ marginBottom: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ padding: "0.625rem 0.75rem", background: "var(--muted)", borderRadius: "calc(var(--radius) - 2px)", fontSize: "0.8125rem", color: "var(--foreground)", lineHeight: 1.5 }}>
            <strong style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>Why it works</strong>
            <p style={{ margin: "0.25rem 0 0" }}>{story.viralityReason}</p>
          </div>
          <div style={{ padding: "0.625rem 0.75rem", background: "rgba(10,102,194,0.06)", borderRadius: "calc(var(--radius) - 2px)", fontSize: "0.8125rem", color: "var(--foreground)", lineHeight: 1.5, border: "1px solid rgba(10,102,194,0.15)" }}>
            <strong style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#0A66C2" }}>Best angle to take</strong>
            <p style={{ margin: "0.25rem 0 0" }}>{story.angle}</p>
          </div>
          {story.sources?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {story.sources.slice(0, 3).map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: "9999px", padding: "0.15rem 0.5rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <ExternalLink size={9} />{s.title.slice(0, 30)}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.625rem", borderTop: "1px solid var(--border)", marginTop: "0.625rem" }}>
        <button
          onClick={onPick}
          disabled={isWritingThis || isWritingAll}
          className="btn-primary"
          style={{ flex: 1, fontSize: "0.8125rem", padding: "0.5rem 0.875rem" }}
        >
          {isWritingThis ? <><RefreshCw size={12} className="animate-spin" /> Writing...</> : "Write Post on This →"}
        </button>
      </div>
    </div>
  );
}

// ─── Draft Card (for "Generate All" comparison) ──────────────────────────────
function DraftCard({ draft, isSelected, onSelect }: { draft: PostDraft; isSelected: boolean; onSelect: () => void }) {
  const scoreColor = draft.score >= 8 ? "#16A34A" : draft.score >= 6 ? "#D97706" : "#6B7280";
  return (
    <div onClick={onSelect} style={{
      border: `2px solid ${isSelected ? "var(--foreground)" : "var(--border)"}`,
      borderRadius: "var(--radius)", padding: "1rem",
      cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s",
      boxShadow: isSelected ? "0 0 0 3px rgba(0,0,0,0.08)" : "none",
      background: isSelected ? "var(--card)" : "transparent",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground)", maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {draft.topic}
        </span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: scoreColor, background: `${scoreColor}15`, padding: "0.15rem 0.5rem", borderRadius: 999 }}>
          {draft.score}/10
        </span>
      </div>
      <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
        {draft.text.slice(0, 280)}...
      </p>
      <p style={{ fontSize: "0.75rem", color: scoreColor, marginTop: "0.5rem", lineHeight: 1.4 }}>{draft.scoreReason}</p>
      {isSelected && (
        <div style={{ marginTop: "0.625rem", fontSize: "0.75rem", color: "#16A34A", fontWeight: 600 }}>✓ Selected — will use this post</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function StudioPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // ── Content Type ──
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [carouselType, setCarouselType] = useState<CarouselType>("multi-image");
  const [carouselSlides, setCarouselSlides] = useState<{ imageB64: string; headline: string; body: string; imagePrompt: string }[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(false);
  const [carouselError, setCarouselError] = useState("");
  // Slide count
  const [slideCount, setSlideCount] = useState(5);
  const [recommendedSlideCount, setRecommendedSlideCount] = useState<number | null>(null);
  const [recommendedReason, setRecommendedReason] = useState("");
  // Per-slide retry/edit
  const [retrying, setRetrying] = useState<Record<number, boolean>>({});
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [editInstruction, setEditInstruction] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [carouselProgress, setCarouselProgress] = useState<{ done: number; total: number; status: string } | null>(null);

  // ── Phase 1a: News Scout ──
  const [customTopic, setCustomTopic] = useState("");
  const [newsPhase, setNewsPhase] = useState<"idle" | "loading" | "stories" | "writing" | "allLoading" | "allDrafts">("idle");
  const [newsStories, setNewsStories] = useState<NewsStory[]>([]);
  const [newsError, setNewsError] = useState("");
  const [writingStoryIdx, setWritingStoryIdx] = useState<number | null>(null);
  const [allDrafts, setAllDrafts] = useState<PostDraft[]>([]);
  const [selectedDraftIdx, setSelectedDraftIdx] = useState(0);

  // ── Phase 1b: Post Review ──
  const [genStep, setGenStep] = useState(-1);
  const [postText, setPostText] = useState("");
  const [topic, setTopic] = useState("");
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [debateLog, setDebateLog] = useState("");
  const [textError, setTextError] = useState("");
  const [textModel, setTextModel] = useState("");
  const [showDebate, setShowDebate] = useState(false);

  // Step 2 — Image
  const [imgLoading, setImgLoading] = useState(false);
  const [imageB64, setImageB64] = useState("");
  const [imageModel, setImageModel] = useState("");
  const [imgError, setImgError] = useState("");

  // Step 3 — Video
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [ytDescription, setYtDescription] = useState("");
  const [ytJobId, setYtJobId] = useState("");
  const [ytOperationName, setYtOperationName] = useState("");

  // Step 4 — Publish
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ linkedin?: boolean; youtube?: boolean; linkedinPostId?: string; ytVideoId?: string; error?: string } | null>(null);
  const [publishPlatforms, setPublishPlatforms] = useState({ linkedin: true, youtube: false });

  useEffect(() => {
    if (videoUrl && !publishPlatforms.youtube) {
      setPublishPlatforms(prev => ({ ...prev, youtube: true }));
    }
  }, [videoUrl]);

  // ── Scout news ──────────────────────────────────────────────────────────────
  const scoutNews = async () => {
    setNewsPhase("loading");
    setNewsError("");
    setNewsStories([]);
    try {
      const res = await fetch("/api/generate/news-scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customTopic: customTopic || undefined }),
      });
      const data = await res.json();
      if (!data.stories?.length) throw new Error(data.error || "No stories returned");
      setNewsStories(data.stories);
      setNewsPhase("stories");
    } catch (e: any) {
      setNewsError(String(e));
      setNewsPhase("idle");
    }
  };

  // ── Write post from a specific story ────────────────────────────────────────
  const writeFromStory = async (story: NewsStory, storyIdx: number) => {
    setWritingStoryIdx(storyIdx);
    setNewsPhase("writing");
    setGenStep(0);
    setTextError("");

    try {
      const res = await fetch("/api/generate/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: story.title }),
      });
      setGenStep(1);
      const data = await res.json();
      if (!data.success || !data.linkedin?.text) throw new Error(data.error || "Text generation failed");
      setGenStep(2);
      await new Promise(r => setTimeout(r, 400));
      setPostText(data.linkedin.text);
      setTopic(data.topic ?? story.title);
      setSources(data.sources ?? story.sources ?? []);
      setDebateLog(data.debateRaw ?? "");
      setTextModel(data.modelUsed ?? "");
      setGenStep(-1);
    } catch (e: any) {
      setTextError(String(e));
      setNewsPhase("stories");
      setGenStep(-1);
      setWritingStoryIdx(null);
    }
  };

  // ── Generate posts on ALL stories ───────────────────────────────────────────
  const generateAllDrafts = async () => {
    setNewsPhase("allLoading");
    setAllDrafts([]);
    setSelectedDraftIdx(0);

    try {
      // Fire all in parallel
      const results = await Promise.allSettled(
        newsStories.map(story =>
          fetch("/api/generate/text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic: story.title }),
          }).then(r => r.json())
        )
      );

      const drafts: PostDraft[] = results
        .map((r, i) => {
          if (r.status === "rejected" || !r.value?.success) return null;
          const text: string = r.value.linkedin?.text ?? "";
          // Score based on story virality + first-line hook strength
          const baseScore = newsStories[i].viralityScore;
          const hookBonus = text.split("\n")[0].length < 100 ? 1 : 0;
          const score = Math.min(10, Math.round((baseScore + hookBonus) / 1));
          return {
            topic: newsStories[i].title,
            text,
            sources: r.value.sources ?? [],
            score: Math.min(10, score),
            scoreReason: newsStories[i].viralityReason,
          } as PostDraft;
        })
        .filter((d): d is PostDraft => d !== null)
        .sort((a, b) => b.score - a.score);

      if (!drafts.length) throw new Error("All post generations failed");
      setAllDrafts(drafts);
      setSelectedDraftIdx(0);
      setNewsPhase("allDrafts");
    } catch (e: any) {
      setNewsError(String(e));
      setNewsPhase("stories");
    }
  };

  // ── Confirm selected draft ───────────────────────────────────────────────────
  const confirmDraft = () => {
    const d = allDrafts[selectedDraftIdx];
    setPostText(d.text);
    setTopic(d.topic);
    setSources(d.sources);
    setNewsPhase("writing"); // re-use writing phase to show post review
  };

  // ── Generate Text (direct, skip news step) ──────────────────────────────────
  const generateText = async () => {
    setGenStep(0);
    setTextError("");
    setPostText("");
    setSources([]);
    setDebateLog("");
    setTopic("");
    setNewsPhase("writing");

    try {
      const res = await fetch("/api/generate/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: customTopic || undefined }),
      });
      setGenStep(1);
      const data = await res.json();
      if (!data.success || !data.linkedin?.text) throw new Error(data.error || "Text generation failed");
      setGenStep(2);
      await new Promise(r => setTimeout(r, 400));
      setPostText(data.linkedin.text);
      setTopic(data.topic ?? "");
      setSources(data.sources ?? []);
      setDebateLog(data.debateRaw ?? "");
      setTextModel(data.modelUsed ?? "");
      setGenStep(-1);
    } catch (e: any) {
      setTextError(String(e));
      setNewsPhase("idle");
      setGenStep(-1);
    }
  };

  const approveText = async () => {
    if (!contentType) return;

    // YouTube-only: skip image, go straight to video (step 2 = Video)
    if (contentType === "youtube") {
      setStep(2);
      setVideoLoading(true); setVideoError(""); setVideoUrl("");
      try {
        const res = await fetch("/api/youtube/generate-video", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postText, topic }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Video generation failed");
        const { jobId, operationName } = data;
        setYtJobId(jobId ?? ""); setYtOperationName(operationName ?? "");
        setYtTitle(data.title ?? topic); setYtDescription(data.description ?? postText.slice(0, 500));
        await pollVideo(jobId, operationName);
      } catch (e: any) { setVideoError(String(e)); }
      setVideoLoading(false);
      return;
    }

    // Carousel: advance to step 2 to choose type — generation starts only when user clicks Generate
    if (contentType === "carousel") {
      setStep(2);
      return;
    }

    // LinkedIn or Both: generate image
    setStep(2);
    setImgLoading(true); setImgError(""); setImageB64("");

    // For "both": also fire video in parallel
    const imagePromise = fetch("/api/linkedin/generate-image", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postText, sources, topic }),
    }).then(r => r.json());

    const videoPromise = contentType === "both"
      ? fetch("/api/youtube/generate-video", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postText, topic }),
        }).then(r => r.json())
      : Promise.resolve(null);

    if (contentType === "both") {
      setVideoLoading(true); setVideoError(""); setVideoUrl("");
    }

    const [imgData, vidData] = await Promise.all([imagePromise, videoPromise]);

    if (imgData.success && imgData.imageB64) {
      setImageB64(imgData.imageB64); setImageModel(imgData.modelUsed ?? "");
    } else {
      setImgError(imgData.error || "Image generation failed");
    }
    setImgLoading(false);

    if (contentType === "both" && vidData) {
      if (vidData.success) {
        const { jobId, operationName } = vidData;
        setYtJobId(jobId ?? ""); setYtOperationName(operationName ?? "");
        setYtTitle(vidData.title ?? topic); setYtDescription(vidData.description ?? postText.slice(0, 500));
        try { await pollVideo(jobId, operationName); } catch (e: any) { setVideoError(String(e)); }
      } else {
        setVideoError(vidData.error || "Video generation failed");
      }
      setVideoLoading(false);
    }
  };

  // Shared video polling helper
  const pollVideo = async (jobId: string, operationName: string) => {
    let isDone = false; let attempts = 0;
    while (!isDone && attempts < 90) {
      attempts++;
      await new Promise(r => setTimeout(r, 8000));
      const statusRes = await fetch(`/api/youtube/video-status?jobId=${jobId}&operationName=${encodeURIComponent(operationName)}`);
      const statusData = await statusRes.json();
      if (statusData.error) throw new Error(statusData.error.message || "Video generation failed during polling");
      if (statusData.done) {
        isDone = true;
        if (statusData.response?.error) throw new Error(statusData.response.error.message || "Generation failed");
        let uri = "";
        const rd = statusData.response;
        if (rd?.response?.videos?.[0]?.bytesBase64Encoded) uri = `data:video/mp4;base64,${rd.response.videos[0].bytesBase64Encoded}`;
        else if (rd?.videos?.[0]?.bytesBase64Encoded) uri = `data:video/mp4;base64,${rd.videos[0].bytesBase64Encoded}`;
        else if (rd?.response?.artifacts?.[0]?.uri) uri = rd.response.artifacts[0].uri;
        else if (rd?.artifacts?.[0]?.uri) uri = rd.artifacts[0].uri;
        if (uri && (uri.toLowerCase().endsWith(".mp4") || uri.startsWith("data:video/"))) setVideoUrl(uri);
        else if (statusData.videoUrl) setVideoUrl(statusData.videoUrl);
        else throw new Error("Unable to extract video from response.");
      }
    }
    if (!isDone) throw new Error("Video generation timed out after 12 minutes.");
  };

  // For LinkedIn-only: image approved → skip video → go to publish (step 3)
  // For "both": image approved → step 3 = Video review → step 4 = Publish
  const approveImage = async () => {
    if (contentType === "linkedin") {
      setStep(3); // Publish is step 3 for linkedin-only
      return;
    }
    // "both" — video was already firing in parallel during approveText, just advance
    setStep(3);
  };

  const generateCarousel = async () => {
    setCarouselLoading(true); setCarouselError(""); setCarouselSlides([]);
    setRecommendedSlideCount(null); setRecommendedReason("");
    setCarouselProgress({ done: 0, total: slideCount, status: "Planning your slides with AI..." });
    try {
      const res = await fetch("/api/linkedin/generate-carousel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText, topic, carouselType, slideCount }),
      });
      if (!res.ok) throw new Error("Failed to start carousel generation");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let buffer = "";
      let totalSlides = slideCount;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const eventMatch = block.match(/event:\s*(.*)/);
          const dataMatch = block.match(/data:\s*(.*)/);
          if (eventMatch && dataMatch) {
            const event = eventMatch[1].trim();
            const data = JSON.parse(dataMatch[1].trim());

            if (event === "plan") {
              if (data.recommendedSlideCount) setRecommendedSlideCount(data.recommendedSlideCount);
              if (data.reason) setRecommendedReason(data.reason);
              totalSlides = data.slideCount || slideCount;
              setCarouselProgress({ done: 0, total: totalSlides, status: `Generating ${totalSlides} slides...` });
            } else if (event === "slide") {
              setCarouselProgress(prev => ({ ...prev!, done: data.index, total: totalSlides, status: `Generating visual for slide ${data.index + 1} of ${totalSlides}...` }));
              setCarouselSlides(prev => {
                const arr = [...prev];
                arr[data.index] = data.slide;
                return arr;
              });
            } else if (event === "slide_update") {
              setCarouselProgress(prev => ({ ...prev!, done: data.index + 1, status: `Slide ${data.index + 1} of ${totalSlides} ready ✓` }));
              setCarouselSlides(prev => {
                const arr = [...prev];
                arr[data.index] = data.slide;
                return arr;
              });
            } else if (event === "done") {
              setCarouselProgress({ done: totalSlides, total: totalSlides, status: "All slides generated!" });
            } else if (event === "error") {
              throw new Error(data.error);
            }
          }
        }
      }
    } catch (e: any) {
      setCarouselError(String(e));
    }
    setCarouselLoading(false);
    setCarouselProgress(null);
  };

  const handleRetryImage = async (index: number) => {
    const slide = carouselSlides[index];
    if (!slide?.imagePrompt) return;
    setRetrying(prev => ({ ...prev, [index]: true }));
    try {
      const res = await fetch("/api/carousel/retry-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePrompt: slide.imagePrompt, slideIndex: index }),
      });
      const data = await res.json();
      if (data.imageB64) {
        setCarouselSlides(prev => prev.map((s, i) => i === index ? { ...s, imageB64: data.imageB64 } : s));
      }
    } catch (e: any) { console.error("retry-image error:", e); }
    setRetrying(prev => ({ ...prev, [index]: false }));
  };

  const handleEditImage = async (index: number) => {
    const slide = carouselSlides[index];
    if (!slide?.imagePrompt || !editInstruction.trim()) return;
    setEditLoading(true);
    try {
      const res = await fetch("/api/carousel/edit-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalPrompt: slide.imagePrompt, userInstruction: editInstruction, slideIndex: index }),
      });
      const data = await res.json();
      if (data.imageB64) {
        setCarouselSlides(prev => prev.map((s, i) =>
          i === index ? { ...s, imageB64: data.imageB64, imagePrompt: data.updatedPrompt ?? s.imagePrompt } : s
        ));
        setEditingSlide(null); setEditInstruction("");
      }
    } catch (e: any) { console.error("edit-image error:", e); }
    setEditLoading(false);
  };

  const regenVideo = async () => {
    setVideoUrl(""); setVideoError(""); setVideoLoading(true);
    try {
      const res = await fetch("/api/youtube/generate-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText, topic }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setYtJobId(data.jobId ?? ""); setYtOperationName(data.operationName ?? "");
      setYtTitle(data.title ?? topic); setYtDescription(data.description ?? postText.slice(0, 500));
      await pollVideo(data.jobId, data.operationName);
    } catch (e: any) { setVideoError(String(e)); }
    setVideoLoading(false);
  };


  const publish = async () => {
    setStep(4);
    setPublishing(true);
    setPublishResult(null);

    const result: any = {};

    if (publishPlatforms.linkedin) {
      try {
        let pdfB64: string | undefined = undefined;

        // If carousel, capture slides to PDF first
        if (contentType === "carousel" && carouselSlides.length > 0) {
          const pdf = new jsPDF({ orientation: "p", unit: "px", format: [1080, 1080] });

          const compressImage = (b64: string): Promise<string> => {
            return new Promise(resolve => {
              const img = new window.Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = 1080; canvas.height = 1080;
                const ctx = canvas.getContext("2d");
                if (ctx) ctx.drawImage(img, 0, 0, 1080, 1080);
                resolve(canvas.toDataURL("image/jpeg", 0.78));
              };
              // It's likely PNG from gemini, but we just use base64
              img.src = `data:image/png;base64,${b64}`;
            });
          };

          for (let i = 0; i < carouselSlides.length; i++) {
            const slide = carouselSlides[i];
            if (slide.imageB64) {
              if (i > 0) pdf.addPage([1080, 1080]);
              const jpegDataUrl = await compressImage(slide.imageB64);
              pdf.addImage(jpegDataUrl, "JPEG", 0, 0, 1080, 1080);
            }
          }
          // Get base64 without the data URI prefix
          const pdfDataUri = pdf.output("datauristring");
          pdfB64 = pdfDataUri.split(",")[1];
        }

        const res = await fetch("/api/linkedin/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: postText, topic, imageB64, pdfB64 }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
           result.linkedin = false;
           result.error = data.error || "LinkedIn posting failed";
        } else {
           result.linkedin = true;
           result.linkedinPostId = data.postId;
        }
      } catch (e: any) {
        result.linkedin = false;
        result.error = e.message || String(e);
      }
    }

    if (publishPlatforms.youtube && ytOperationName) {
      try {
        const res = await fetch("/api/youtube/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: ytJobId || null, operationName: ytOperationName, videoUrl: "", title: ytTitle, description: ytDescription, topic }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
           result.youtube = false;
           result.error = result.error ? `${result.error} | YT: ${data.error}` : data.error;
        } else {
           result.youtube = true;
           result.ytVideoId = data.videoId;
        }
      } catch (e: any) {
        result.youtube = false;
        result.error = result.error ? `${result.error} | YT Exception` : String(e);
      }
    }

    setPublishResult(result);
    setPublishing(false);
  };

  const reset = () => {
    setStep(1);
    setGenStep(-1);
    setCustomTopic("");
    setContentType(null);
    setCarouselSlides([]); setCarouselError(""); setCarouselLoading(false);
    setNewsPhase("idle"); setNewsStories([]); setNewsError(""); setWritingStoryIdx(null);
    setAllDrafts([]); setSelectedDraftIdx(0);
    setPostText(""); setTopic(""); setSources([]); setDebateLog(""); setTextError(""); setTextModel("");
    setImageB64(""); setImgError(""); setImageModel("");
    setVideoUrl(""); setVideoError(""); setYtTitle(""); setYtDescription(""); setYtJobId(""); setYtOperationName("");
    setPublishResult(null);
    setPublishing(false);
  };

  // ── Render ──
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--foreground)" }}>Content Studio</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
            Generate, review, and publish your content — step by step.
          </p>
        </div>
        {(contentType || step > 1 || newsPhase !== "idle") && !publishing && (
          <button onClick={reset} className="btn-ghost" style={{ fontSize: "0.8125rem" }}>
            <RotateCcw size={13} /> Start over
          </button>
        )}
      </div>

      {contentType && <StepBar current={step} contentType={contentType} />}

      {/* ─── STEP 0: CHOOSE CONTENT TYPE ───────────────────────────────────── */}
      {!contentType && (
        <div className="card animate-fade-in">
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.25rem" }}>What are you creating?</h2>
          <ContentTypePicker onPick={ct => { setContentType(ct); }} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* ─── STEP 1: TEXT ─────────────────────────────────────────────────── */}
        {contentType && (
        <StepCard stepNum={1} current={step} title="Create Post" badge={<Pill label="LinkedIn" color="#0A66C2" />}>

          {/* ── 1a-idle: Entry ── */}
          {newsPhase === "idle" && !postText && !textError && (
            <div style={{ padding: "0.25rem 0" }}>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--foreground)", display: "block", marginBottom: "0.5rem" }}>
                  I want to post about <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional — leave blank to auto-scout today&apos;s news)</span>
                </label>
                <input
                  type="text" value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && scoutNews()}
                  placeholder="e.g. OpenAI raised $40B — what does it mean for startups?"
                  className="input-field"
                  style={{ width: "100%", fontSize: "0.875rem" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                <button onClick={scoutNews} className="btn-primary" style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                  🔍 Scout Today&apos;s News
                </button>
                <button onClick={generateText} className="btn-ghost" style={{ padding: "0.75rem", fontSize: "0.875rem", border: "1px solid var(--border)" }}>
                  ⚡ Skip → Write Post Now
                </button>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.75rem", textAlign: "center" }}>
                Scout shows you rated news stories to pick from · Skip goes straight to generating
              </p>
            </div>
          )}

          {/* ── 1a-loading: Scouting ── */}
          {newsPhase === "loading" && (
            <GeneratingState
              steps={["Scanning today’s top news...", "Scoring virality and relevance...", "Ranking stories for your niche..."]}
              current={1}
            />
          )}

          {/* ── 1a-stories: News Cards ── */}
          {newsPhase === "stories" && newsStories.length > 0 && (
            <div className="animate-fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)" }}>
                    Today&apos;s top stories — sorted by virality
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.125rem" }}>
                    Pick one to write a post, or generate posts on all and compare
                  </p>
                </div>
                <button onClick={reset} className="btn-ghost" style={{ fontSize: "0.75rem" }}>
                  <RotateCcw size={11} /> Redo
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {newsStories.map((story, i) => (
                  <StoryCard
                    key={i} story={story} idx={i}
                    isWritingThis={writingStoryIdx === i}
                    isWritingAll={false}
                    onPick={() => writeFromStory(story, i)}
                    onPickAll={generateAllDrafts}
                  />
                ))}
              </div>

              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={generateAllDrafts}
                  className="btn-ghost"
                  style={{ width: "100%", padding: "0.75rem", fontSize: "0.875rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--foreground)" }}
                >
                  {`⚡ Generate Posts on All ${newsStories.length} Stories & Compare`}
                </button>
              </div>
            </div>
          )}

          {/* ── allLoading: Generating all ── */}
          {newsPhase === "allLoading" && (
            <GeneratingState
              steps={newsStories.slice(0, 4).map(s => `Writing post: "${s.title.slice(0, 45)}..."`)}
              current={1}
            />
          )}

          {/* ── allDrafts: Comparison cards ── */}
          {newsPhase === "allDrafts" && allDrafts.length > 0 && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)" }}>
                  {allDrafts.length} posts generated — sorted by engagement score
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.125rem" }}>
                  Click a post to select it, then approve to move to image generation
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1rem" }}>
                {allDrafts.map((draft, i) => (
                  <DraftCard key={i} draft={draft} isSelected={selectedDraftIdx === i} onSelect={() => setSelectedDraftIdx(i)} />
                ))}
              </div>
              <button onClick={confirmDraft} className="btn-primary" style={{ width: "100%" }}>
                Use This Post — Generate Image <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* ── 1b-writing: Generating ── */}
          {newsPhase === "writing" && genStep >= 0 && (
            <GeneratingState
              steps={["Researching latest facts...", "Choosing best post format...", "Writing your post..."]}
              current={genStep}
            />
          )}

          {/* ── News scout error ── */}
          {newsError && (
            <div style={{ padding: "0.875rem 1rem", background: "rgba(220,38,38,0.06)", borderRadius: "var(--radius)", border: "1px solid rgba(220,38,38,0.15)", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.8125rem", color: "#DC2626" }}>{newsError}</p>
              <button onClick={() => { setNewsError(""); setNewsPhase("idle"); }} style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", marginTop: "0.375rem", padding: 0 }}>Dismiss</button>
            </div>
          )}

          {postText && genStep === -1 && (
            <div className="animate-fade-in">
              {topic && (
                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.75rem" }}>
                  Topic: <strong style={{ color: "var(--foreground)" }}>{topic}</strong>
                </p>
              )}

              <textarea
                value={postText}
                onChange={e => setPostText(e.target.value)}
                rows={12}
                className="input-field"
                style={{ resize: "vertical", lineHeight: 1.7, fontSize: "0.875rem", fontFamily: "inherit", marginBottom: "0.875rem" }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <SourcePills sources={sources} />
                <span style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)" }}>
                  {postText.length} / 3000
                </span>
              </div>

              {debateLog && (
                <div style={{ marginBottom: "1rem" }}>
                  <button onClick={() => setShowDebate(!showDebate)} style={{
                    fontSize: "0.75rem", color: "var(--muted-foreground)", background: "none", border: "none",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "0.375rem", padding: 0,
                  }}>
                    {showDebate ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    AI reasoning log
                  </button>
                  {showDebate && (
                    <div style={{
                      marginTop: "0.5rem", padding: "0.75rem", background: "var(--muted)",
                      borderRadius: "var(--radius)", fontSize: "0.6875rem",
                      fontFamily: "monospace", lineHeight: 1.6, maxHeight: 200, overflowY: "auto",
                      color: "var(--muted-foreground)", whiteSpace: "pre-wrap",
                    }}>
                      {debateLog}
                    </div>
                  )}
                </div>
              )}

              {textModel && (
                <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
                  Powered by {textModel}
                </p>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.875rem", borderTop: "1px solid var(--border)" }}>
                <button onClick={generateText} className="btn-ghost" style={{ fontSize: "0.8125rem" }}>
                  <RefreshCw size={13} /> Regenerate
                </button>
                <button onClick={approveText} className="btn-primary">
                  {contentType === "linkedin" && <>Approve — Generate Image <ArrowRight size={14} /></>}
                  {contentType === "youtube" && <>Approve — Generate Video <ArrowRight size={14} /></>}
                  {contentType === "carousel" && <>Approve — Build Slides <ArrowRight size={14} /></>}
                  {contentType === "both" && <>Approve — Generate Image & Video <ArrowRight size={14} /></>}
                </button>
              </div>
            </div>
          )}
        </StepCard>
        )}

        {/* ─── STEP 2: IMAGE / CAROUSEL / VIDEO ─────────────────────────────── */}
        {contentType === "carousel" && (
          <StepCard stepNum={2} current={step} title="Carousel Slides" badge={<Pill label="Nano Banana 1 (gemini-2.5-flash-image)" color="#D97706" />}>

            {/* Type picker — only shown when no slides yet and not loading */}
            {step === 2 && !carouselSlides.length && !carouselLoading && (
              <div>
                <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)", marginBottom: "0.25rem" }}>Choose your carousel format</p>
                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "1.25rem" }}>Each format uses a different hook and image style.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
                  {([
                    { id: "multi-image" as CarouselType, emoji: "🎨", name: "Multi-Image",  hook: "One cinematic visual per key point — stop the scroll",        ex: "Hook → Point 1 → Point 2 → CTA" },
                    { id: "quote-stats" as CarouselType, emoji: "📊", name: "Data & Stats", hook: "Bold type on dark — shocking numbers first",                   ex: "Big Stat → Stat 2 → The Insight" },
                    { id: "how-to"      as CarouselType, emoji: "📋", name: "How-To Guide", hook: "Step-by-step tutorial — transformation promise on slide 1",    ex: "Promise → Step 1 → Step 2 → Result" },
                    { id: "story-arc"  as CarouselType, emoji: "📖", name: "Story Arc",    hook: "Pain point → turning point → lesson → proof → takeaway",      ex: "Pain → Insight → Proof → CTA" },
                    { id: "framework"  as CarouselType, emoji: "🧠", name: "Framework",    hook: "A named mental model — memorable and shareable",               ex: "Name Model → Pillar 1 → Pillar 2 → Apply" },
                  ]).map(t => (
                    <button key={t.id} onClick={() => setCarouselType(t.id)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: "0.875rem",
                        padding: "0.875rem 1rem", borderRadius: "var(--radius)", textAlign: "left",
                        border: `1.5px solid ${carouselType === t.id ? "var(--foreground)" : "var(--border)"}`,
                        background: carouselType === t.id ? "var(--muted)" : "transparent",
                        cursor: "pointer", transition: "all 0.15s", width: "100%",
                      }}>
                      <span style={{ fontSize: "1.25rem", lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{t.emoji}</span>
                      <div>
                        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.125rem" }}>{t.name}</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", lineHeight: 1.4, marginBottom: "0.2rem" }}>{t.hook}</p>
                        <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", fontFamily: "monospace", opacity: 0.7 }}>{t.ex}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {carouselError && (
                  <div style={{ padding: "0.75rem", background: "rgba(220,38,38,0.06)", borderRadius: "var(--radius)", color: "#DC2626", fontSize: "0.8125rem", marginBottom: "0.875rem" }}>{carouselError}</div>
                )}
                <button onClick={generateCarousel} className="btn-primary" style={{ width: "100%", padding: "0.875rem" }}>
                  Generate Slides <ArrowRight size={14} />
                </button>
                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", textAlign: "center", marginTop: "0.5rem" }}>
                  Gemini plans hooks · Nano Banana 2 Pro renders each slide image
                </p>
              </div>
            )}

            {carouselLoading && (
              <div style={{ padding: "1.25rem 0" }}>
                {/* Progress bar */}
                {carouselProgress && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground)" }}>
                        {carouselProgress.status}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", fontWeight: 600 }}>
                        {carouselProgress.done}/{carouselProgress.total} slides
                        {carouselProgress.total > 0 && (
                          <span style={{ marginLeft: "0.5rem", color: "#6366F1" }}>
                            {Math.round((carouselProgress.done / carouselProgress.total) * 100)}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        borderRadius: 999,
                        background: "linear-gradient(90deg, #6366F1, #D97706)",
                        width: `${carouselProgress.total > 0 ? Math.round((carouselProgress.done / carouselProgress.total) * 100) : 5}%`,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                    <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
                      Powered by Nano Banana 1 (Gemini 2.5 Flash Image) · us-central1
                    </p>
                  </div>
                )}
              </div>
            )}

            {!carouselLoading && carouselSlides.length > 0 && (
              <div className="animate-fade-in">
                {/* Google Fonts for carousel typography */}
                <style>{`
                  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap');
                  .cs-headline { font-family: 'Playfair Display', serif; letter-spacing: -0.5px; }
                  .cs-body { font-family: 'DM Sans', sans-serif; }
                  .cs-card { position:relative; aspect-ratio:1/1; border-radius:14px; overflow:hidden; background:#fafafa; border: 1px solid #eaeaea; }
                  .cs-card img.cs-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:transform 0.4s ease; }
                  .cs-card:hover img.cs-bg { transform:scale(1.03); }
                  .cs-text-only { background:linear-gradient(135deg,#fcfcfc 0%,#f0f0f0 100%); }
                  .cs-actions { position:absolute; top:8px; right:8px; display:flex; gap:6px; opacity:0; transition:opacity 0.2s; z-index: 10; }
                  .cs-card:hover .cs-actions { opacity:1; }
                  .cs-action-btn { font-family:'DM Sans',sans-serif; font-size:11px; font-weight:600; padding:4px 10px; border-radius:20px; border:1px solid rgba(0,0,0,0.1); cursor:pointer; backdrop-filter:blur(10px); transition:background 0.15s; }
                  .cs-retry-btn { background:rgba(255,255,255,0.8); color:#111; }
                  .cs-retry-btn:hover { background:rgba(255,255,255,1); }
                  .cs-edit-btn { background:rgba(99,102,241,0.1); color:#6366F1; border-color: rgba(99,102,241,0.2); }
                  .cs-edit-btn:hover { background:rgba(99,102,241,0.2); }
                  .cs-action-btn:disabled { opacity:0.5; cursor:not-allowed; }
                `}</style>

                {/* Header: slide count + AI recommendation */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.125rem" }}>
                      {carouselSlides.length} slides · <span style={{ textTransform: "capitalize" }}>{carouselType.replace(/-/g, " ")}</span>
                    </p>
                    {recommendedReason && (
                      <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)" }}>
                        ✦ {recommendedReason}
                      </p>
                    )}
                  </div>
                  {/* Slide count selector */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {recommendedSlideCount && (
                      <span style={{ fontSize: "0.6875rem", background: "rgba(99,102,241,0.12)", color: "#6366F1", padding: "0.15rem 0.5rem", borderRadius: 20, fontWeight: 600 }}>
                        ✦ AI suggests {recommendedSlideCount}
                      </span>
                    )}
                    <select
                      value={slideCount}
                      onChange={e => setSlideCount(Number(e.target.value))}
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", cursor: "pointer" }}
                    >
                      {[3,4,5,6,7,8].map(n => (
                        <option key={n} value={n}>{n} slides{n === recommendedSlideCount ? " ★" : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Slide cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.25rem" }}>
                  {carouselSlides.map((slide, i) => (
                    <div key={i}>
                      {/* Slide card (Add ID for html2canvas capturing) */}
                      <div id={`carousel-slide-${i}`} className={`cs-card${!slide.imageB64 ? " cs-text-only" : ""}`} style={{ backgroundColor: "#fafafa" }}>
                        {/* Background image or loading state */}
                        {slide.imageB64 ? (
                          <img className="cs-bg" src={`data:image/jpeg;base64,${slide.imageB64}`} alt="" />
                        ) : (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", fontSize: "0.8125rem", background: "rgba(0,0,0,0.02)" }}>
                            <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                              <RefreshCw size={16} className="animate-spin" />
                              <p>Generating visual...</p>
                            </div>
                          </div>
                        )}

                        {/* Hover action buttons */}
                        <div className="cs-actions">
                          <button className="cs-action-btn cs-retry-btn"
                            disabled={retrying[i]}
                            onClick={() => handleRetryImage(i)}>
                            {retrying[i] ? "⟳ Gen..." : "↺ Retry"}
                          </button>
                          <button className="cs-action-btn cs-edit-btn"
                            onClick={() => { setEditingSlide(editingSlide === i ? null : i); setEditInstruction(""); }}>
                            ✎ Edit
                          </button>
                        </div>
                      </div>

                      {/* Inline edit drawer */}
                      {editingSlide === i && (
                        <div style={{
                          marginTop: 8, padding: "0.875rem", borderRadius: 10,
                          background: "var(--muted)", border: "1px solid var(--border)",
                        }}>
                          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.5rem" }}>
                            ✎ What would you like to change about this slide&apos;s image?
                          </p>
                          <textarea
                            value={editInstruction}
                            onChange={e => setEditInstruction(e.target.value)}
                            placeholder="e.g. Make it more futuristic, add electric blue lighting, show a server room..."
                            rows={2}
                            style={{
                              width: "100%", padding: "0.5rem 0.75rem", borderRadius: 8,
                              border: "1px solid var(--border)", background: "var(--background)",
                              color: "var(--foreground)", fontSize: "0.8125rem", resize: "vertical",
                              fontFamily: "inherit",
                            }}
                          />
                          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", justifyContent: "flex-end" }}>
                            <button className="btn-ghost" style={{ fontSize: "0.75rem" }}
                              onClick={() => { setEditingSlide(null); setEditInstruction(""); }}>
                              Cancel
                            </button>
                            <button className="btn-primary" style={{ fontSize: "0.75rem" }}
                              disabled={editLoading || !editInstruction.trim()}
                              onClick={() => handleEditImage(i)}>
                              {editLoading ? "Generating..." : "Apply Change →"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Bottom actions */}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.875rem", borderTop: "1px solid var(--border)" }}>
                  <button onClick={() => { setCarouselSlides([]); setCarouselError(""); setEditingSlide(null); }} className="btn-ghost" style={{ fontSize: "0.8125rem" }}>
                    <RefreshCw size={13} /> Regenerate All
                  </button>
                  <button onClick={() => setStep(3)} className="btn-primary">Approve — Publish <ArrowRight size={14} /></button>
                </div>
              </div>
            )}
          </StepCard>
        )}



        {/* Image step — shown for linkedin and both */}
        {(contentType === "linkedin" || contentType === "both") && (
        <StepCard stepNum={2} current={step} title="Review Generated Image"
          badge={<Pill label="Nano Banana 2 Pro" color="#B45309" />}>

          {imgLoading && (
            <GeneratingState
              steps={["Building visual prompt...", "Generating image..."]}
              current={1}
            />
          )}

          {imgError && !imgLoading && (
            <div style={{ padding: "0.875rem 1rem", background: "rgba(220,38,38,0.06)", borderRadius: "var(--radius)", border: "1px solid rgba(220,38,38,0.15)", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.8125rem", color: "#DC2626", marginBottom: "0.5rem" }}>{imgError}</p>
              <button onClick={approveText} className="btn-ghost" style={{ fontSize: "0.8125rem" }}>
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          )}

          {imageB64 && !imgLoading && (
            <div className="animate-fade-in">
              <img
                src={`data:image/jpeg;base64,${imageB64}`}
                alt="AI generated"
                style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", marginBottom: "0.875rem" }}
              />
              {imageModel && (
                <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
                  Generated by {imageModel}
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.875rem", borderTop: "1px solid var(--border)" }}>
                <button onClick={approveText} className="btn-ghost" style={{ fontSize: "0.8125rem" }}>
                  <RefreshCw size={13} /> Regenerate image
                </button>
                <button onClick={approveImage} className="btn-primary">
                  Approve — Generate Video <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </StepCard>
        )}

        {/* Video step — shown for youtube (step 2) and both (step 3) */}
        {(contentType === "youtube" || contentType === "both") && (
        <StepCard stepNum={contentType === "youtube" ? 2 : 3} current={step}
          title="Generated Video" badge={<Pill label="Veo 3.1" color="#7C3AED" />}>

          {videoLoading && (
            <GeneratingState
              steps={["Building cinematic prompt...", "Processing reference image...", "Generating video with Veo 3.1..."]}
              current={2}
            />
          )}

          {videoError && !videoLoading && (
            <div style={{ padding: "0.875rem 1rem", background: "rgba(220,38,38,0.06)", borderRadius: "var(--radius)", border: "1px solid rgba(220,38,38,0.15)", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.8125rem", color: "#DC2626", marginBottom: "0.5rem" }}>{videoError}</p>
              <button onClick={() => setStep(contentType === "youtube" ? 2 : 3)} className="btn-ghost" style={{ fontSize: "0.8125rem" }}>
                  <RefreshCw size={13} /> Retry
                </button>
            </div>
          )}

          {videoUrl && !videoLoading && (
            <div className="animate-fade-in">
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.875rem" }}>
                <video
                  src={videoUrl}
                  controls
                  style={{
                    width: "auto",
                    maxHeight: 480,
                    aspectRatio: "9/16",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    display: "block",
                  }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label className="label">YouTube Title</label>
                <input value={ytTitle} onChange={e => setYtTitle(e.target.value)} className="input-field" />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label className="label">Description</label>
                <textarea value={ytDescription} onChange={e => setYtDescription(e.target.value)} className="input-field" rows={4} style={{ resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.875rem", borderTop: "1px solid var(--border)" }}>
                <button onClick={regenVideo} className="btn-ghost" style={{ fontSize: "0.8125rem" }}>
                  <RefreshCw size={13} /> Regenerate video
                </button>
                <button onClick={() => { const publishStep = contentType === "youtube" ? 3 : 4; setStep(publishStep); setPublishResult(null); }} className="btn-primary">
                  Review and Publish <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </StepCard>
        )}

        {/* ─── PUBLISH STEP ─────────────────────────────────────────────────── */}
        <StepCard stepNum={contentType === "both" ? 4 : 3} current={step} title="Publish">
          {step === (contentType === "both" ? 4 : 3) && !publishing && !publishResult && (
            <div className="animate-fade-in">
              <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1.25rem" }}>
                Choose where to publish your content.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {[
                  { key: "linkedin", label: "LinkedIn", sublabel: "Post text + image to your profile", hidden: contentType === "youtube" },
                  { key: "youtube", label: "YouTube", sublabel: "Upload generated video to your channel", disabled: !videoUrl, hidden: contentType === "linkedin" || contentType === "carousel" },
                ].filter(p => !p.hidden).map(p => (
                  <label key={p.key} style={{
                    display: "flex", alignItems: "center", gap: "0.875rem",
                    padding: "0.875rem 1rem", borderRadius: "var(--radius)",
                    border: `1px solid ${publishPlatforms[p.key as "linkedin" | "youtube"] ? "var(--foreground)" : "var(--border)"}`,
                    cursor: p.disabled ? "not-allowed" : "pointer",
                    transition: "border-color 0.15s",
                    opacity: p.disabled ? 0.5 : 1,
                  }}>
                    <input
                      type="checkbox"
                      checked={publishPlatforms[p.key as "linkedin" | "youtube"]}
                      disabled={p.disabled}
                      onChange={e => setPublishPlatforms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                      style={{ accentColor: "var(--foreground)", width: 16, height: 16 }}
                    />
                    <div>
                      <p style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--foreground)" }}>{p.label}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{p.sublabel}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button onClick={() => setStep(3)} className="btn-ghost" style={{ fontSize: "0.8125rem" }}>
                  Back
                </button>
                <button onClick={publish} className="btn-primary" style={{ padding: "0.75rem 2rem" }}>
                  Publish Now
                </button>
              </div>
            </div>
          )}

          {publishing && (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <RefreshCw size={24} className="animate-spin" style={{ color: "var(--foreground)", margin: "0 auto 1rem" }} />
              <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Publishing your content...</p>
            </div>
          )}

          {publishResult && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {publishResult.linkedin !== undefined && (
                <div style={{
                  padding: "1rem", borderRadius: "var(--radius)",
                  background: publishResult.linkedin ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)",
                  border: `1px solid ${publishResult.linkedin ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
                  display: "flex", alignItems: "center", gap: "0.75rem",
                }}>
                  {publishResult.linkedin ? <CheckCircle size={18} style={{ color: "#16A34A" }} /> : <AlertCircle size={18} style={{ color: "#DC2626" }} />}
                  <div>
                    <p style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--foreground)" }}>LinkedIn</p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                      {publishResult.linkedin ? "Published successfully" : publishResult.error ?? "Failed"}
                    </p>
                  </div>
                  {publishResult.linkedin && publishResult.linkedinPostId && (
                    <a href={`https://www.linkedin.com/feed/update/${publishResult.linkedinPostId}`} target="_blank" rel="noreferrer"
                      style={{ marginLeft: "auto", fontSize: "0.8125rem", color: "var(--foreground)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      View post <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}

              {publishResult.youtube !== undefined && (
                <div style={{
                  padding: "1rem", borderRadius: "var(--radius)",
                  background: publishResult.youtube ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)",
                  border: `1px solid ${publishResult.youtube ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
                  display: "flex", alignItems: "center", gap: "0.75rem",
                }}>
                  {publishResult.youtube ? <CheckCircle size={18} style={{ color: "#16A34A" }} /> : <AlertCircle size={18} style={{ color: "#DC2626" }} />}
                  <div>
                    <p style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--foreground)" }}>YouTube</p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                      {publishResult.youtube ? "Upload started — processing on YouTube" : (publishResult.error ?? "Upload failed")}
                    </p>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
                <button onClick={() => router.push("/dashboard")} className="btn-ghost" style={{ fontSize: "0.8125rem" }}>
                  Back to Dashboard
                </button>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={() => { setPublishResult(null); setStep(4); }} className="btn-outline" style={{ fontSize: "0.8125rem", padding: "0.5rem 1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                    Try Again
                  </button>
                  <button onClick={reset} className="btn-primary">
                    Create Another Post
                  </button>
                </div>
              </div>
            </div>
          )}
        </StepCard>

      </div>
    </div>
  );
}
