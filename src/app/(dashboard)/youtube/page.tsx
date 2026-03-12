"use client";

import { useEffect, useState } from "react";
import {
  Youtube, RefreshCw, CheckCircle, Clock, AlertCircle,
  ExternalLink, Wand2, Search, ArrowRight, ChevronLeft,
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Video {
  id: string;
  title: string;
  status: string;
  youtube_video_id: string | null;
  created_at: string;
  error: string | null;
}
type CreateStep = "idle" | "topic" | "generating" | "review" | "uploading" | "done";

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    published:  { color: "#3D5E41", label: "Published" },
    generating: { color: "#7A5A2A", label: "Generating" },
    failed:     { color: "#7A3A2A", label: "Failed" },
  };
  const s = map[status] ?? { color: "var(--muted-foreground)", label: status };
  return (
    <span style={{
      fontSize: "0.6875rem", fontWeight: 600, padding: "0.2rem 0.625rem",
      borderRadius: 9999, background: `${s.color}18`, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function YouTubePage() {
  const [tab, setTab] = useState<"videos" | "create">("videos");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [ytConnected, setYtConnected] = useState(true);

  // Create flow state
  const [createStep, setCreateStep] = useState<CreateStep>("idle");
  const [topic, setTopic] = useState("");
  const [postText, setPostText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [ytDescription, setYtDescription] = useState("");
  const [jobId, setJobId] = useState("");
  const [operationName, setOperationName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; error?: string } | null>(null);

  useEffect(() => {
    async function load() {
      setLoadingVideos(true);
      try {
        const [connRes, vidRes] = await Promise.all([
          fetch("/api/settings/connections"),
          fetch("/api/youtube/videos"),
        ]);
        const conn = await connRes.json();
        if (!conn.youtube?.connected) { setYtConnected(false); setLoadingVideos(false); return; }
        const vid = await vidRes.json();
        setVideos(vid.videos ?? []);
      } catch { /* noop */ }
      setLoadingVideos(false);
    }
    load();
  }, []);

  // ─── Poll video completion ─────────────────────────────────────────────────
  const pollVideo = async (jId: string, opName: string) => {
    let done = false; let attempts = 0;
    while (!done && attempts < 90) {
      attempts++;
      await new Promise(r => setTimeout(r, 8000));
      const statusRes = await fetch(`/api/youtube/video-status?jobId=${jId}&operationName=${encodeURIComponent(opName)}`);
      const statusData = await statusRes.json();
      if (statusData.error) throw new Error(statusData.error.message || "Polling failed");
      if (statusData.done) {
        done = true;
        if (statusData.response?.error) throw new Error(statusData.response.error.message || "Generation failed");
        let uri = "";
        const rd = statusData.response;
        if (rd?.response?.videos?.[0]?.bytesBase64Encoded) uri = `data:video/mp4;base64,${rd.response.videos[0].bytesBase64Encoded}`;
        else if (rd?.videos?.[0]?.bytesBase64Encoded) uri = `data:video/mp4;base64,${rd.videos[0].bytesBase64Encoded}`;
        else if (rd?.response?.artifacts?.[0]?.uri) uri = rd.response.artifacts[0].uri;
        else if (rd?.artifacts?.[0]?.uri) uri = rd.artifacts[0].uri;
        if (uri) setVideoUrl(uri);
        else if (statusData.videoUrl) setVideoUrl(statusData.videoUrl);
        else throw new Error("Unable to extract video URL");
      }
    }
    if (!done) throw new Error("Timed out after 12 min");
  };

  // ─── Generate Script + Start Video ────────────────────────────────────────
  const startGenerate = async () => {
    if (!topic.trim()) { setGenError("Please enter a topic"); return; }
    setGenerating(true); setGenError(""); setPostText("");
    try {
      // Generate script / hook text
      const textRes = await fetch("/api/generate/text", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const textData = await textRes.json();
      if (!textData.success) throw new Error(textData.error || "Script generation failed");
      const script = textData.linkedin?.text ?? "";
      setPostText(script);

      // Start video generation
      setVideoLoading(true); setVideoError(""); setVideoUrl("");
      const vidRes = await fetch("/api/youtube/generate-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText: script, topic }),
      });
      const vidData = await vidRes.json();
      if (!vidData.success) throw new Error(vidData.error || "Video gen failed");

      setJobId(vidData.jobId ?? "");
      setOperationName(vidData.operationName ?? "");
      setYtTitle(vidData.title ?? topic);
      setYtDescription(vidData.description ?? script.slice(0, 500));
      setCreateStep("generating");

      await pollVideo(vidData.jobId, vidData.operationName);
      setCreateStep("review");
    } catch (e: any) {
      setVideoError(String(e));
      setCreateStep("review");
    }
    setGenerating(false);
    setVideoLoading(false);
  };

  // ─── Upload to YouTube ─────────────────────────────────────────────────────
  const uploadVideo = async () => {
    setUploading(true); setCreateStep("uploading");
    try {
      const res = await fetch("/api/youtube/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, title: ytTitle, description: ytDescription }),
      });
      const data = await res.json();
      setUploadResult(data.success ? { success: true } : { success: false, error: data.error });
    } catch (e: any) {
      setUploadResult({ success: false, error: String(e) });
    }
    setUploading(false);
    setCreateStep("done");
  };

  const resetCreate = () => {
    setCreateStep("idle"); setTopic(""); setPostText("");
    setVideoUrl(""); setVideoError(""); setVideoLoading(false);
    setGenError(""); setYtTitle(""); setYtDescription("");
    setJobId(""); setOperationName(""); setUploadResult(null);
  };

  // ─── Not connected ─────────────────────────────────────────────────────────
  if (!ytConnected) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }} className="animate-fade-in">
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.75rem" }}>YouTube</h1>
        <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <Youtube size={36} style={{ color: "var(--muted-foreground)", margin: "0 auto 1rem" }} />
          <p style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "0.5rem" }}>YouTube not connected</p>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>
            Connect your YouTube channel to upload Veo 3.1 generated videos automatically.
          </p>
          <Link href="/settings/connections" className="btn-primary" style={{ textDecoration: "none" }}>
            Connect YouTube
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }} className="animate-fade-in">
      {/* Header + tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--foreground)" }}>YouTube</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["videos", "create"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); if (t === "create") resetCreate(); }}
              style={{
                fontSize: "0.8125rem", fontWeight: 500, padding: "0.375rem 0.875rem",
                borderRadius: "var(--radius)", border: "1px solid var(--border)",
                background: tab === t ? "var(--foreground)" : "transparent",
                color: tab === t ? "#fff" : "var(--muted-foreground)",
                cursor: "pointer", transition: "all 0.15s",
              }}>
              {t === "create" ? <><Wand2 size={13} style={{ display: "inline", marginRight: 4 }} />Create Short</> : "My Videos"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── MY VIDEOS TAB ─────────────────────────────────────────────────── */}
      {tab === "videos" && (
        <>
          {loadingVideos && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {[1, 2, 3].map(i => <div key={i} className="card animate-pulse-soft" style={{ height: 72, background: "var(--muted)" }} />)}
            </div>
          )}
          {!loadingVideos && videos.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <Youtube size={32} style={{ color: "var(--muted-foreground)", margin: "0 auto 1rem" }} />
              <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1.25rem" }}>
                No videos yet. Create your first YouTube Short below.
              </p>
              <button onClick={() => setTab("create")} className="btn-primary">
                <Wand2 size={14} /> Create Short
              </button>
            </div>
          )}
          {!loadingVideos && videos.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {videos.map(v => (
                <div key={v.id} className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.5rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 8, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {v.status === "published" ? <CheckCircle size={20} style={{ color: "var(--accent-foreground)" }} />
                      : v.status === "generating" ? <RefreshCw size={20} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
                      : <AlertCircle size={20} style={{ color: "#B83232" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</p>
                      <StatusBadge status={v.status} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Clock size={11} style={{ color: "var(--muted-foreground)" }} />
                      <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)" }}>
                        {new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    {v.error && <p style={{ fontSize: "0.6875rem", color: "#B83232", marginTop: "0.25rem" }}>{v.error}</p>}
                  </div>
                  {v.youtube_video_id && (
                    <a href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`} target="_blank" rel="noreferrer"
                      className="btn-ghost" style={{ fontSize: "0.8125rem", flexShrink: 0 }}>
                      <ExternalLink size={13} /> Watch
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── CREATE SHORT TAB ────────────────────────────────────────────────── */}
      {tab === "create" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Step 1: Topic */}
          {(createStep === "idle" || createStep === "topic") && (
            <div className="card animate-fade-in">
              <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.25rem" }}>Create YouTube Short</h2>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", marginBottom: "1.25rem" }}>
                Enter a topic — AI will write the hook script and generate a 9:16 Veo video.
              </p>

              <label style={{ fontSize: "0.8125rem", fontWeight: 500, display: "block", marginBottom: "0.375rem" }}>
                Topic / Angle
              </label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. OpenAI raised $40B — what founders should know"
                className="input-field"
                style={{ marginBottom: "0.875rem" }}
                onKeyDown={e => e.key === "Enter" && startGenerate()}
              />

              {genError && (
                <div style={{ padding: "0.75rem", background: "rgba(220,38,38,0.06)", borderRadius: "var(--radius)", border: "1px solid rgba(220,38,38,0.15)", color: "#DC2626", fontSize: "0.8125rem", marginBottom: "0.875rem" }}>
                  {genError}
                </div>
              )}

              <button onClick={startGenerate} disabled={generating} className="btn-primary" style={{ width: "100%" }}>
                {generating ? <><RefreshCw size={14} className="animate-spin" /> Generating...</> : <><Search size={14} /> Generate Short</>}
              </button>
            </div>
          )}

          {/* Step 2: Generating */}
          {createStep === "generating" && (
            <div className="card animate-fade-in" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
              <RefreshCw size={28} className="animate-spin" style={{ color: "var(--foreground)", margin: "0 auto 1rem" }} />
              <p style={{ fontWeight: 600, marginBottom: "0.375rem" }}>Generating your Short</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                Writing hook script → Starting Veo 3.1 → Polling for completion…
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
                Veo videos take 3–12 minutes. Hang tight.
              </p>
            </div>
          )}

          {/* Step 3: Review */}
          {createStep === "review" && (
            <>
              <div className="card animate-fade-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Review Video</h2>
                  <button onClick={resetCreate} className="btn-ghost" style={{ fontSize: "0.8125rem" }}>
                    <ChevronLeft size={13} /> Start over
                  </button>
                </div>

                {videoError && (
                  <div style={{ padding: "0.875rem", background: "rgba(220,38,38,0.06)", borderRadius: "var(--radius)", border: "1px solid rgba(220,38,38,0.15)", color: "#DC2626", fontSize: "0.8125rem", marginBottom: "1rem" }}>
                    {videoError}
                    <button onClick={() => { setVideoError(""); setVideoLoading(true); pollVideo(jobId, operationName).catch(e => setVideoError(String(e))).finally(() => setVideoLoading(false)); }}
                      className="btn-ghost" style={{ fontSize: "0.8125rem", marginLeft: "0.75rem" }}>
                      Retry polling
                    </button>
                  </div>
                )}

                {videoLoading && (
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    <RefreshCw size={22} className="animate-spin" style={{ color: "var(--foreground)", margin: "0 auto 0.75rem" }} />
                    <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>Waiting for Veo to finish…</p>
                  </div>
                )}

                {videoUrl && !videoLoading && (
                  <div className="animate-fade-in">
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                      <video src={videoUrl} controls style={{ width: "auto", maxHeight: 400, aspectRatio: "9/16", borderRadius: 8, border: "1px solid var(--border)" }} />
                    </div>
                    <div style={{ marginBottom: "0.875rem" }}>
                      <label className="label">YouTube Title</label>
                      <input value={ytTitle} onChange={e => setYtTitle(e.target.value)} className="input-field" />
                    </div>
                    <div style={{ marginBottom: "1rem" }}>
                      <label className="label">Description</label>
                      <textarea value={ytDescription} onChange={e => setYtDescription(e.target.value)} className="input-field" rows={4} style={{ resize: "vertical" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.875rem", borderTop: "1px solid var(--border)" }}>
                      <button onClick={resetCreate} className="btn-ghost" style={{ fontSize: "0.8125rem" }}>Discard</button>
                      <button onClick={uploadVideo} className="btn-primary">
                        Upload to YouTube <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 4: Uploading */}
          {createStep === "uploading" && (
            <div className="card animate-fade-in" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
              <RefreshCw size={24} className="animate-spin" style={{ color: "var(--foreground)", margin: "0 auto 1rem" }} />
              <p style={{ fontWeight: 600 }}>Uploading to YouTube…</p>
            </div>
          )}

          {/* Step 5: Done */}
          {createStep === "done" && (
            <div className="card animate-fade-in" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
              {uploadResult?.success ? (
                <>
                  <CheckCircle size={32} style={{ color: "#16A34A", margin: "0 auto 1rem" }} />
                  <p style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.5rem" }}>Uploaded!</p>
                  <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>
                    Your Short is processing on YouTube (usually ready in 1–5 min).
                  </p>
                  <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                    <button onClick={() => { setTab("videos"); }} className="btn-ghost" style={{ fontSize: "0.8125rem" }}>View My Videos</button>
                    <button onClick={resetCreate} className="btn-primary">Create Another</button>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={32} style={{ color: "#DC2626", margin: "0 auto 1rem" }} />
                  <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Upload failed</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>{uploadResult?.error}</p>
                  <button onClick={() => setCreateStep("review")} className="btn-ghost">Go back and retry</button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
