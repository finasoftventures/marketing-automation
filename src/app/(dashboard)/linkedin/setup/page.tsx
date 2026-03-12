"use client";

import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles, User, Target, FileText, Lightbulb, RefreshCw, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const TONE_OPTIONS = [
    { value: "analytical", label: "𝗔𝗻𝗮𝗹𝘆𝘁𝗶𝗰𝗮𝗹", desc: "Data-driven, fact-heavy, insider perspective" },
    { value: "inspirational", label: "𝗜𝗻𝘀𝗽𝗶𝗿𝗮𝘁𝗶𝗼𝗻𝗮𝗹", desc: "Motivational, storytelling, emotional hooks" },
    { value: "provocative", label: "𝗣𝗿𝗼𝘃𝗼𝗰𝗮𝘁𝗶𝘃𝗲", desc: "Hot takes, challenging status quo, bold claims" },
    { value: "educational", label: "𝗘𝗱𝘂𝗰𝗮𝘁𝗶𝗼𝗻𝗮𝗹", desc: "How-to, frameworks, teaching moments" },
    { value: "casual", label: "𝗖𝗮𝘀𝘂𝗮𝗹", desc: "Conversational, authentic, behind-the-scenes" },
];

const NICHE_SUGGESTIONS = [
    "AI / Machine Learning", "SaaS / Startups", "Web Development", "Product Management",
    "Marketing / Growth", "Finance / FinTech", "Healthcare Tech", "Cybersecurity",
    "Data Science", "DevOps / Cloud", "Blockchain / Web3", "EdTech",
];

export default function LinkedInSetupPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [loaded, setLoaded] = useState(false);

    // Form fields
    const [name, setName] = useState("");
    const [headline, setHeadline] = useState("");
    const [niche, setNiche] = useState("");
    const [targetAudience, setTargetAudience] = useState("");
    const [tone, setTone] = useState("");
    const [pillars, setPillars] = useState<string[]>([]);
    const [pillarInput, setPillarInput] = useState("");
    const [samplePosts, setSamplePosts] = useState<string[]>(["", "", ""]);

    // Load existing profile
    useEffect(() => {
        fetch("/api/linkedin/profile-setup")
            .then(r => r.json())
            .then(d => {
                if (d.profile) {
                    const p = d.profile;
                    setName(p.name ?? "");
                    setHeadline(p.headline ?? "");
                    setNiche(p.niche ?? "");
                    setTargetAudience(p.target_audience ?? "");
                    setTone(p.tone ?? "");
                    setPillars(p.content_pillars ?? []);
                    setSamplePosts(p.sample_posts?.length ? p.sample_posts : ["", "", ""]);
                }
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    const addPillar = () => {
        if (pillarInput.trim() && pillars.length < 6) {
            setPillars([...pillars, pillarInput.trim()]);
            setPillarInput("");
        }
    };

    const removePillar = (i: number) => setPillars(pillars.filter((_, idx) => idx !== i));

    const updateSample = (i: number, val: string) => {
        const copy = [...samplePosts];
        copy[i] = val;
        setSamplePosts(copy);
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        try {
            const res = await fetch("/api/linkedin/profile-setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name, headline, niche, target_audience: targetAudience,
                    tone, content_pillars: pillars,
                    sample_posts: samplePosts.filter(s => s.trim()),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setStep(5); // success state
                setTimeout(() => router.push("/linkedin"), 2000);
            } else {
                setError(data.error ?? "Save failed");
            }
        } catch {
            setError("Network error");
        }
        setSaving(false);
    };

    if (!loaded) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center">
                <RefreshCw size={24} className="mx-auto animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-xl font-semibold">LinkedIn Profile Setup</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Help the AI understand your style so it writes posts that sound like 𝘆𝗼𝘂.
                </p>
            </div>

            {/* Progress */}
            <div className="flex gap-1">
                {[1, 2, 3, 4].map(s => (
                    <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
                ))}
            </div>

            {/* ── Step 1: Identity ── */}
            {step === 1 && (
                <div className="card space-y-4">
                    <div className="flex items-center gap-2">
                        <User size={16} className="text-primary" />
                        <h2 className="text-sm font-semibold">Who are you?</h2>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name</label>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="Mahesh Singla" className="input-field w-full text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">LinkedIn Headline</label>
                            <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="AI ML Developer at Finasoft Ventures | SaaS, Python" className="input-field w-full text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Niche</label>
                            <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="AI / Machine Learning" className="input-field w-full text-sm" />
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {NICHE_SUGGESTIONS.map(n => (
                                    <button key={n} onClick={() => setNiche(n)}
                                        className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${niche === n ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button onClick={() => setStep(2)} disabled={!name.trim() || !niche.trim()} className="btn-primary text-sm w-full mt-2">
                        Next <ArrowRight size={14} />
                    </button>
                </div>
            )}

            {/* ── Step 2: Audience & Tone ── */}
            {step === 2 && (
                <div className="card space-y-4">
                    <div className="flex items-center gap-2">
                        <Target size={16} className="text-primary" />
                        <h2 className="text-sm font-semibold">Audience & Voice</h2>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Who reads your posts?</label>
                        <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
                            placeholder="AI engineers, startup founders, tech enthusiasts in India" className="input-field w-full text-sm" />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Your writing tone</label>
                        <div className="space-y-1.5">
                            {TONE_OPTIONS.map(t => (
                                <button key={t.value} onClick={() => setTone(t.value)}
                                    className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${tone === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${tone === t.value ? "border-primary" : "border-muted-foreground/30"}`}>
                                        {tone === t.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold">{t.label}</p>
                                        <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Content Pillars <span className="text-muted-foreground/50">(topics you post about)</span></label>
                        <div className="flex gap-2">
                            <input value={pillarInput} onChange={e => setPillarInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && addPillar()}
                                placeholder="e.g. AI News, Founder Lessons, Hot Takes..." className="input-field flex-1 text-sm" />
                            <button onClick={addPillar} className="btn-secondary text-xs shrink-0">Add</button>
                        </div>
                        {pillars.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {pillars.map((p, i) => (
                                    <span key={i} className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-medium flex items-center gap-1">
                                        {p}
                                        <button onClick={() => removePillar(i)} className="hover:opacity-60 ml-0.5">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => setStep(1)} className="btn-ghost text-sm flex-1"><ArrowLeft size={14} /> Back</button>
                        <button onClick={() => setStep(3)} disabled={!tone || !targetAudience.trim()} className="btn-primary text-sm flex-1">Next <ArrowRight size={14} /></button>
                    </div>
                </div>
            )}

            {/* ── Step 3: Sample Posts ── */}
            {step === 3 && (
                <div className="card space-y-4">
                    <div className="flex items-center gap-2">
                        <FileText size={16} className="text-primary" />
                        <h2 className="text-sm font-semibold">Your Best Posts</h2>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Paste 1-3 of your top-performing LinkedIn posts. The AI will extract your unique writing patterns, hooks, and structure.
                    </p>

                    {samplePosts.map((post, i) => (
                        <div key={i}>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Post {i + 1} {i === 0 ? "(required)" : "(optional)"}</label>
                            <textarea
                                value={post}
                                onChange={e => updateSample(i, e.target.value)}
                                placeholder={i === 0 ? "Paste your best performing LinkedIn post here..." : "Optional — paste another post for better style learning..."}
                                rows={5}
                                className="input-field w-full resize-none text-sm leading-relaxed"
                            />
                        </div>
                    ))}

                    <div className="flex gap-2">
                        <button onClick={() => setStep(2)} className="btn-ghost text-sm flex-1"><ArrowLeft size={14} /> Back</button>
                        <button onClick={() => setStep(4)} disabled={!samplePosts[0]?.trim()} className="btn-primary text-sm flex-1">Next <ArrowRight size={14} /></button>
                    </div>
                </div>
            )}

            {/* ── Step 4: Review & Save ── */}
            {step === 4 && (
                <div className="card space-y-4">
                    <div className="flex items-center gap-2">
                        <Lightbulb size={16} className="text-primary" />
                        <h2 className="text-sm font-semibold">Review Your Profile</h2>
                    </div>

                    <div className="space-y-2.5">
                        {[
                            ["Name", name],
                            ["Headline", headline],
                            ["Niche", niche],
                            ["Audience", targetAudience],
                            ["Tone", tone],
                            ["Pillars", pillars.join(", ") || "—"],
                            ["Sample posts", `${samplePosts.filter(s => s.trim()).length} provided`],
                        ].map(([label, val]) => (
                            <div key={label as string} className="flex gap-3 p-2.5 rounded-lg bg-muted/40">
                                <p className="text-xs font-semibold w-24 shrink-0 text-muted-foreground">{label}</p>
                                <p className="text-xs text-foreground">{val}</p>
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                            <AlertCircle size={13} /> {error}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={() => setStep(3)} className="btn-ghost text-sm flex-1"><ArrowLeft size={14} /> Back</button>
                        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex-1">
                            {saving ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : <><Sparkles size={14} /> Save & Start Posting</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step 5: Success ── */}
            {step === 5 && (
                <div className="card text-center py-10">
                    <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
                    <h2 className="text-lg font-semibold">Profile saved!</h2>
                    <p className="text-sm text-muted-foreground mt-1">Redirecting to your LinkedIn dashboard...</p>
                </div>
            )}
        </div>
    );
}
