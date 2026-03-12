import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { getSessionUserId } from "@/lib/social-tokens";
import { createClient } from "@supabase/supabase-js";

async function getVertexToken(): Promise<string> {
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const t = await client.getAccessToken();
  return t.token!;
}

const projectId = () => process.env.GOOGLE_PROJECT_ID!;

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  token: string,
  useGrounding = false,
  temperature = 0.4
): Promise<string> {
  const model = "gemini-3.1-pro-preview";
  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${projectId()}/locations/global/publishers/google/models/${model}:generateContent`;

  const body: any = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { temperature, maxOutputTokens: 4096 },
  };

  // NOTE: Cannot use JSON structured output with grounding — known Gemini limitation.
  // When grounding is ON, we get raw prose. When OFF, we can request JSON.
  if (useGrounding) {
    body.tools = [{ googleSearch: {} }];
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error [${res.status}]: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

// POST /api/generate/news-scout
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { customTopic } = await req.json();

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: userProfile } = await db
    .from("users")
    .select("niche_description, persona")
    .eq("id", userId)
    .single();

  const niche = userProfile?.niche_description || "AI, startups, venture capital, tech";

  const token = await getVertexToken();

  // ── STEP 1: Grounded search to get PROSE summary ───────────────────────────
  // Cannot request JSON when grounding is enabled — Gemini will output prose.
  // So we ask for a clearly structured prose summary with numbered sections.
  const groundedQuery = customTopic
    ? `Research the very latest news, facts, and angles about: "${customTopic}". Focus on developments from the last 24–72 hours. Find surprising statistics, expert quotes, or counter-intuitive angles. Describe 3–5 key stories or angles, explaining what happened, why it matters to startup founders and investors, and what the most surprising or controversial angle is. Be specific with numbers and sources.`
    : `Find today's 6–8 most impactful breaking news stories in: ${niche}. Focus on stories from the last 24 hours that would surprise or challenge professional assumptions. For each story: headline, what happened, why it matters to founders/investors, surprising angle, and virality score 1–10.`;

  const groundedProse = await callGemini(
    customTopic
      ? `You are a research analyst specializing in ${niche}. Find the very latest facts.`
      : `You are an elite news intelligence analyst for startup founders and professionals in: ${niche}.`,
    groundedQuery,
    token,
    true, // WITH grounding
    0.3
  );

  if (!groundedProse) {
    return NextResponse.json({ error: "News search returned no results", stories: [] }, { status: 200 });
  }

  // ── STEP 2: No grounding — structure the prose into JSON ──────────────────
  // WITHOUT grounding, Gemini reliably produces JSON.
  const jsonPrompt = `You are a JSON formatter. Convert the following news research into a structured JSON array of stories.

RESEARCH TEXT:
"""
${groundedProse}
"""

OUTPUT RULES:
- Return ONLY a valid JSON array — no markdown, no backticks, no explanation
- Each element must have exactly these fields:
  {
    "title": "Short punchy headline (max 12 words)",
    "summary": "2–3 sentence summary of what happened and why it matters to founders",
    "viralityScore": <integer 1-10>,
    "viralityReason": "One sentence: why this will perform well on LinkedIn",
    "angle": "The most counter-intuitive or surprising angle for a LinkedIn post",
    "sources": [{"title": "Source name", "url": "https://..."}]
  }
- Include 3–6 stories sorted by viralityScore descending
- If a source URL is not known, omit the sources array or use []
- viralityScore must be an integer between 1 and 10
- Return ONLY the JSON array, starting with [ and ending with ]`;

  const jsonText = await callGemini(
    "You are a precise JSON formatter. You output only valid JSON arrays, nothing else.",
    jsonPrompt,
    token,
    false, // WITHOUT grounding — enables reliable JSON output
    0.1
  );

  // Parse JSON
  let stories: any[] = [];
  try {
    // Strip any accidental markdown wrappers
    const cleaned = jsonText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    stories = JSON.parse(cleaned);
    if (!Array.isArray(stories)) throw new Error("Not an array");
  } catch {
    // Final fallback: try to extract JSON array from somewhere in the text
    const match = jsonText.match(/\[[\s\S]*\]/);
    if (match) {
      try { stories = JSON.parse(match[0]); } catch { stories = []; }
    }
  }

  // Validate + sanitize story objects
  stories = stories
    .filter(s => s && typeof s.title === "string" && typeof s.viralityScore === "number")
    .map(s => ({
      title: String(s.title ?? "").slice(0, 120),
      summary: String(s.summary ?? "").slice(0, 500),
      viralityScore: Math.min(10, Math.max(1, Math.round(s.viralityScore))),
      viralityReason: String(s.viralityReason ?? ""),
      angle: String(s.angle ?? ""),
      sources: Array.isArray(s.sources) ? s.sources.slice(0, 3) : [],
    }));

  return NextResponse.json({
    stories,
    niche,
    customTopic: customTopic || null,
    scoutedAt: new Date().toISOString(),
    debug: { proseLength: groundedProse.length, rawJsonLength: jsonText.length },
  });
}
