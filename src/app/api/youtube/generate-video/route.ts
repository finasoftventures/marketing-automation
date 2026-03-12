import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { getSessionUserId } from "@/lib/social-tokens";
import { createClient } from "@supabase/supabase-js";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

// Build a hook-first voiceover script using Gemini
async function buildVoiceoverScript(
  postText: string,
  topic: string,
  token: string
): Promise<{ hookSentence: string; visualDirection: string }> {
  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/global/publishers/google/models/gemini-2.0-flash-001:generateContent`;

  const prompt = `You are a viral YouTube Shorts hook writer. Your job is to make people STOP scrolling within the first second.

Given this LinkedIn post, write a powerful 8-second spoken hook for a YouTube Short.

POST TEXT:
"""
${postText}
"""

TOPIC: ${topic}

Rules:
- HOOK: Exactly 1 sentence, max 20 words. Must be the most surprising, shocking, or counter-intuitive insight from the post. Written to be spoken aloud by a confident voice. Start with a number, a provocative claim, or "Nobody talks about..."
- VISUAL: 1 sentence — describe cinematic vertical (9:16) background visuals that match the topic. No people, no text overlays. Think: stock market tickers, city skylines at night, server racks, startup offices, abstract financial charts.

OUTPUT FORMAT (exactly):
HOOK: [sentence here]
VISUAL: [visual direction here]`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 200 },
    }),
  });

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  const hookMatch = raw.match(/HOOK:\s*(.+)/i);
  const visualMatch = raw.match(/VISUAL:\s*(.+)/i);

  return {
    hookSentence: hookMatch?.[1]?.trim() ?? `${topic}: here's what nobody is saying.`,
    visualDirection: visualMatch?.[1]?.trim() ?? `Cinematic ${topic} B-roll, vertical format, dramatic lighting`,
  };
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { postText, topic } = await req.json();
  if (!postText) {
    return NextResponse.json({ error: "postText is required" }, { status: 400 });
  }

  const projectId = process.env.GOOGLE_PROJECT_ID!;
  const location = process.env.GOOGLE_LOCATION ?? "us-central1";

  try {
    const token = await getVertexToken();

    // 1. Build hook-first voiceover script with Gemini
    const { hookSentence, visualDirection } = await buildVoiceoverScript(
      postText,
      topic ?? "this topic",
      token
    );

    // 2. Start Veo 3.1 long-running generation — 9:16 portrait with audio
    const veoEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/veo-3.1-generate-001:predictLongRunning`;

    const veoBody = {
      instances: [{
        prompt: visualDirection,
        voiceoverText: hookSentence,   // spoken narration by Veo AI voice
      }],
      parameters: {
        aspectRatio: "9:16",           // portrait for YouTube Shorts
        durationSeconds: 8,            // Veo max per clip
        sampleCount: 1,
        generateAudio: true,           // enable AI voiceover
      },
    };

    const veoRes = await fetch(veoEndpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(veoBody),
    });

    if (!veoRes.ok) {
      const err = await veoRes.text();
      return NextResponse.json({ error: "Veo generation failed", detail: err }, { status: 400 });
    }

    const veoData = await veoRes.json();
    const operationName = veoData.name;

    // 3. Save youtube_videos row as 'generating'
    const aiTitle = topic
      ? `${topic.slice(0, 80)} | ${new Date().getFullYear()}`
      : "AI Content | AutoPilot";
    const aiDescription = postText.slice(0, 500);

    const { data: videoRow } = await serviceClient()
      .from("youtube_videos")
      .insert({
        user_id: userId,
        title: aiTitle,
        description: aiDescription,
        operation_name: operationName,
        status: "generating",
      })
      .select("id")
      .single();

    return NextResponse.json({
      success: true,
      jobId: videoRow?.id,
      operationName,
      title: aiTitle,
      description: aiDescription,
      hookSentence,
      visualDirection,
    });

  } catch (err) {
    return NextResponse.json({ error: "Video generation failed", detail: String(err) }, { status: 500 });
  }
}
