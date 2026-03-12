import { NextRequest, NextResponse } from "next/server";
import { getVertexToken, generateSlideImage, PROJECT_ID, VERTEX_REGION } from "@/lib/carousel-image";

async function rewriteImagePrompt(originalPrompt: string, userInstruction: string, token: string): Promise<string> {
  const endpoint = `https://${VERTEX_REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID()}/locations/${VERTEX_REGION}/publishers/google/models/gemini-2.5-flash:generateContent`;
  const prompt = `You are a visual director for LinkedIn carousel slides.

ORIGINAL IMAGE PROMPT:
"${originalPrompt}"

USER WANTS TO CHANGE:
"${userInstruction}"

Rewrite the image prompt incorporating the user's change.
RULES:
- Keep the cinematic dark aesthetic — bottom 40% in shadow for white text overlay
- Absolutely NO text, NO words, NO letters, NO UI elements in the image
- ONE concrete physical anchor (object/scene/silhouette)
- Specify: subject + lighting + ONE accent color + angle + mood
- Minimum 40 words, written like a film DP briefing
- Return ONLY the new prompt text, nothing else`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
    }),
  });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? originalPrompt;
}

export async function POST(req: NextRequest) {
  try {
    const { originalPrompt, userInstruction, slideIndex = 0 } = await req.json();
    if (!originalPrompt || !userInstruction) {
      return NextResponse.json({ error: "originalPrompt and userInstruction required" }, { status: 400 });
    }
    const token = await getVertexToken();
    const newPrompt = await rewriteImagePrompt(originalPrompt, userInstruction, token);
    const imageB64 = await generateSlideImage(newPrompt, slideIndex + 1, token);
    return NextResponse.json({ imageB64, updatedPrompt: newPrompt });
  } catch (err: any) {
    console.error("[edit-image]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
