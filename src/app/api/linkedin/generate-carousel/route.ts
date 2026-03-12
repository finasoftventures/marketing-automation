import { NextRequest, NextResponse } from "next/server";
import { getVertexToken, generateSlideImage, PROJECT_ID, VERTEX_REGION } from "@/lib/carousel-image";

// ─── Plan carousel slides via Gemini 2.5 Flash ────────────────────────────────
async function planCarouselSlides(
  postText: string,
  topic: string,
  carouselType: string,
  slideCount: number,
  token: string
): Promise<{
  recommendedSlideCount: number;
  reason: string;
  slides: { headline: string; body: string; imagePrompt: string }[];
}> {
  const typeInstructions: Record<string, string> = {
    "multi-image": `${slideCount} slides: Slide 1=Hook → Slides 2–${slideCount - 1}=Key insights → Slide ${slideCount}=CTA`,
    "quote-stats": `${slideCount} slides: Slide 1=Most shocking stat → Middle=Supporting data → Last=The insight`,
    "how-to":      `${slideCount} slides: Slide 1=Transformation promise → Middle=Numbered steps → Last=Result+CTA`,
    "story-arc":   `${slideCount} slides: Slide 1=Relatable pain → Turning point → Lesson → Proof → Takeaway`,
    "framework":   `${slideCount} slides: Slide 1=Name the framework → Middle=One pillar each → Last=How to apply`,
  };
  const structure = typeInstructions[carouselType] ?? typeInstructions["multi-image"];
  const isTextFocused = carouselType === "quote-stats" || carouselType === "framework";

  const prompt = `You are a world-class LinkedIn carousel strategist AND visual director.

TASK: Plan a "${carouselType}" carousel that stops the scroll and forces people to read every slide.

TOPIC: ${topic || "general business insight"}
POST:
"""${postText.slice(0, 900)}"""

CAROUSEL STRUCTURE: ${structure}
REQUESTED SLIDE COUNT: ${slideCount}

SLIDE 1 — HOOK (special rules):
- Headline: 3–6 words MAX, present threat or extreme curiosity, Title Case
- Body: complete the hook — do NOT explain it — make them NEED to swipe
- Image: widest, most atmospheric scene in the set. Maximum drama. Wide-angle.

SLIDES 2–${slideCount - 1} — INSIGHTS:
- Headline: 4–8 words, one powerful claim per slide, Title Case
- Body: 1–2 sentences, max 25 words, every word earns its place
- Image: one CONCRETE physical scene as metaphor for the slide's idea

LAST SLIDE — CTA:
- Headline: direct instruction or reflection question
- Body: what should they do or think next
- Image: forward-looking, slightly warmer/lighter contrast to earlier dark slides

FOR EACH SLIDE:
1. "headline" — punchy Title Case, following rules above
2. "body" — high-impact, max 25 words
3. "imagePrompt" — The complete slide design including text:
   • The image MUST contain the exact "headline" and "body" text visibly written in the center of the image.
   • Specify: Typography (bold elegant serif for headline, clean sans-serif for body) + style (minimalist flat vector illustration, premium editorial layout) + background color (off-white, cream, or soft beige) + ONE accent color for illustrations (e.g., terracotta, slate blue).
   • Minimalist composition with extreme negative space. Clean, sophisticated lines. NO photography, NO 3D scenes.
   • The text MUST be the most prominent element, perfectly centered and highly legible, with abstract conceptual line-art framing it.
   • Written like an art director briefing an editorial designer — minimum 50 words

ALSO RETURN:
- "recommendedSlideCount": integer 3–8 based on post depth (short → 3–4, dense → 6–8, sweet spot 5–6)
- "reason": one sentence

Return ONLY valid JSON, no markdown:
{
  "recommendedSlideCount": 5,
  "reason": "...",
  "slides": [
    { "headline": "...", "body": "...", "imagePrompt": "..." }
  ]
}`;

  const endpoint = `https://${VERTEX_REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID()}/locations/${VERTEX_REGION}/publishers/google/models/gemini-2.5-flash:generateContent`;
  console.log(`[carousel] Step 1: planning ${slideCount} slides`);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.65, maxOutputTokens: 8192 },
    }),
  });

  const rawRes = await res.text();
  console.log(`[carousel] Step 1 status: ${res.status}`);
  if (!res.ok) {
    console.error(`[carousel] Step 1 error:`, rawRes.slice(0, 400));
    throw new Error(`Slide planning failed [${res.status}]: ${rawRes.slice(0, 300)}`);
  }

  let data: any;
  try { data = JSON.parse(rawRes); } catch { throw new Error(`Step 1 parse failed: ${rawRes.slice(0, 200)}`); }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  console.log(`[carousel] Step 1 raw (first 400):`, text.slice(0, 400));

  let parsed: any = {};
  try {
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch {
        const slidesMatch = text.match(/\[[\s\S]*\]/);
        if (slidesMatch) {
          try { parsed = { slides: JSON.parse(slidesMatch[0]) }; } catch { /* no-op */ }
        }
        if (!parsed.slides?.length) {
          throw new Error(`Cannot parse planning response (${text.length} chars): ${text.slice(0, 300)}`);
        }
      }
    }
  }

  return {
    recommendedSlideCount: parsed.recommendedSlideCount ?? slideCount,
    reason: parsed.reason ?? "",
    slides: (parsed.slides ?? []).filter((s: any) => s?.headline && s?.imagePrompt),
  };
}

// ─── POST /api/linkedin/generate-carousel (SSE Streaming) ───────────────────
export async function POST(req: NextRequest) {
  try {
    const { postText, topic, carouselType = "multi-image", slideCount = 5 } = await req.json();
    if (!postText) return NextResponse.json({ error: "postText required" }, { status: 400 });

    console.log(`[carousel] Starting: type=${carouselType} requestedSlides=${slideCount}`);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const token = await getVertexToken();
          sendEvent("status", { message: "Planning slides..." });

          const plan = await planCarouselSlides(postText, topic, carouselType, slideCount, token);
          sendEvent("plan", { recommendedSlideCount: plan.recommendedSlideCount, reason: plan.reason, slideCount: plan.slides.length });

          if (!plan.slides.length) throw new Error("AI returned no slide content");

          const maxSlides = Math.min(plan.slides.length, slideCount, 8);
          const slides: any[] = [];

          for (let i = 0; i < maxSlides; i++) {
            const { headline, body, imagePrompt } = plan.slides[i];
            
            // Output slide structure (text ready, pending image)
            slides.push({ headline, body, imagePrompt, imageB64: null });
            sendEvent("slide", { index: i, slide: slides[i] });

            try {
              if (i > 0) await new Promise(r => setTimeout(r, 6000));
              const imageB64 = await generateSlideImage(imagePrompt, i + 1, token);
              slides[i].imageB64 = imageB64;
              sendEvent("slide_update", { index: i, slide: slides[i] });
            } catch (err: any) {
              console.error(`[carousel] Slide ${i + 1} image failed (non-fatal):`, err.message);
              sendEvent("slide_error", { index: i, error: err.message });
            }
          }

          sendEvent("done", { success: true, slides });
          controller.close();
        } catch (err: any) {
          console.error("[carousel] Fatal Stream Error:", err.message);
          sendEvent("error", { error: err.message ?? "Carousel generation failed" });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  } catch (err: any) {
    console.error("[carousel] Fatal:", err.message);
    return NextResponse.json({ error: err.message ?? "Carousel generation failed" }, { status: 500 });
  }
}
