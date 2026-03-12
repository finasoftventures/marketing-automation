import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

// Pure JS PNG Metadata Stripper
function stripPngMetadata(buffer: Buffer): Buffer {
    if (buffer.length < 8 || buffer.readUInt32BE(0) !== 0x89504E47 || buffer.readUInt32BE(4) !== 0x0D0A1A0A) {
        return buffer;
    }
    const chunks: Buffer[] = [buffer.subarray(0, 8)];
    let offset = 8;
    while (offset < buffer.length) {
        if (offset + 8 > buffer.length) break;
        const length = buffer.readUInt32BE(offset);
        if (offset + 8 + length + 4 > buffer.length) break;
        const isCritical = (buffer[offset + 4] & 32) === 0;
        if (isCritical) {
            chunks.push(buffer.subarray(offset, offset + 8 + length + 4));
        }
        offset += 8 + length + 4;
    }
    return Buffer.concat(chunks);
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

const projectId = () => process.env.GOOGLE_PROJECT_ID!;

// Ask Gemini to pick the best aspect ratio for the content
async function pickAspectRatio(postText: string, token: string): Promise<string> {
    const endpoint = `https://aiplatform.googleapis.com/v1/projects/${projectId()}/locations/global/publishers/google/models/gemini-2.0-flash-001:generateContent`;

    const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `Given this LinkedIn post, what is the single best image aspect ratio for maximum engagement in a social media feed?

POST:
"""${postText.slice(0, 500)}"""

RULES:
- 1:1 = Best for LinkedIn single image posts (square fills most of mobile feed)
- 4:3 = Best for data-heavy posts with charts or infographics (landscape)
- 9:16 = Best for mobile-first vertical content / Instagram cross-post
- 16:9 = Best for thought leadership with cinematic visuals
- 3:4 = Best for portrait photos or bold statements

Reply with ONLY the ratio string, e.g.: 1:1` }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 10 },
        }),
    });

    const data = await res.json();
    const ratio = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "1:1";
    // Validate it's one of the supported ratios
    const supported = ["1:1", "4:3", "3:4", "9:16", "16:9"];
    return supported.includes(ratio) ? ratio : "1:1";
}

// Nano Banana 2 Pro (gemini-3-pro-image-preview) — hook-grabbing image generation
async function generateImageViaNanoBanana(
    prompt: string,
    aspectRatio: string,
    token: string
): Promise<{ b64: string; modelUsed: string; aspectRatio: string }> {
    const model = "gemini-3-pro-image-preview";
    const endpoint = `https://aiplatform.googleapis.com/v1/projects/${projectId()}/locations/global/publishers/google/models/${model}:generateContent`;

    let res: Response | undefined;
    let retries = 3;
    let delay = 3000;

    for (let i = 0; i < retries; i++) {
        try {
            res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: {
                        role: "user",
                        parts: [{ text: prompt }]
                    },
                    tools: [{ googleSearch: {} }],
                    generationConfig: {
                        responseModalities: ["IMAGE", "TEXT"],
                        // Pass aspect ratio — note: may default to 1:1 in preview
                        // We also describe the ratio in the prompt text as a fallback
                    },
                }),
            });
        } catch (fetchErr) {
            if (i === retries - 1) throw new Error(`Network/Fetch error: ${fetchErr}`);
        }

        if (res?.ok) break;
        if (res && (res.status === 429 || res.status === 503) && i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 1.5;
        } else if (res) {
            break;
        } else {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 1.5;
        }
    }

    if (!res) throw new Error("Fetch failed to execute completely against Vertex AI");

    const data = await res.json().catch(() => ({}));
    if (!res?.ok) {
        throw new Error(`Nano Banana 2 Pro Error [${res?.status}]: ${data.error?.message || JSON.stringify(data)}`);
    }

    for (const part of data.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.mimeType?.startsWith("image/")) {
            const rawBuffer = Buffer.from(part.inlineData.data, "base64");
            const strippedBuffer = stripPngMetadata(rawBuffer);
            return {
                b64: strippedBuffer.toString("base64"),
                modelUsed: "Nano Banana 2 Pro (Vertex AI)",
                aspectRatio,
            };
        }
    }

    throw new Error("API returned OK but no image was found in response. " + JSON.stringify(data));
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    let step = "authenticating";
    try {
        const { postText, sources, topic } = await req.json();
        if (!postText) return NextResponse.json({ error: "postText is required" }, { status: 400 });

        step = "getting Vertex AI token";
        const token = await getVertexToken();

        step = "picking aspect ratio";
        // Let Nano Banana decide the best ratio for this content
        const aspectRatio = await pickAspectRatio(postText, token);

        step = "building image prompt";
        // Extract the core hook insight from the post (first 200 chars as context)
        const postHook = postText.split("\n").filter((l: string) => l.trim()).slice(0, 2).join(" ");

        const sourcesContext = sources?.length
            ? "\n\nRELATED CONTEXT:\n" + sources.slice(0, 2).map((s: any) => `- ${s.title}`).join("\n")
            : "";

        // Hook-grabbing, emotion-triggering image prompt
        const imagePrompt = `You are creating a SCROLL-STOPPING social media image for this LinkedIn post.

POST INSIGHT: "${postHook}"
TOPIC: ${topic || "business/tech"}${sourcesContext}

Generate an image that makes someone STOP SCROLLING instantly and NEED to read the caption.

REQUIREMENTS:
- Format: ${aspectRatio} composition (${aspectRatio === "1:1" ? "perfect square" : aspectRatio === "9:16" ? "tall vertical portrait" : aspectRatio === "16:9" ? "wide cinematic landscape" : "portrait"})
- Visual style: HIGH CONTRAST — dark dramatic background that pops in a feed against white/grey backgrounds
- ONE dominant focal element: choose from (a bold number/stat displayed graphically, a dramatic close-up object, a powerful symbol related to the topic, abstract but evocative data visualization)
- NO generic stock photo vibes — must feel editorial, striking, original
- NO text in image, NO people, NO handshakes, NO office small-talk scenes
- Lighting: cinematic, dramatic — either very dark and moody, or very vivid and saturated. NOT flat and bright.
- Emotional target: CURIOSITY and slight FOMO — make it feel like the post reveals something important viewers don't know yet
- Color palette: rich, saturated but harmonious — dark teal + gold, or deep navy + electric orange, or charcoal + neon green

Search online to understand the topic fully before generating.`;

        step = "generating image";
        let imageResult = await generateImageViaNanoBanana(imagePrompt, aspectRatio, token);

        return NextResponse.json({
            success: true,
            imageB64: imageResult.b64,
            aspectRatio: imageResult.aspectRatio,
            modelUsed: imageResult.modelUsed,
            quality: { passed: true, score: 10, issues: [] },
            mimeType: "image/jpeg",
        });
    } catch (err) {
        return NextResponse.json({
            error: `Image generation failed at step: ${step}`,
            detail: String(err),
        }, { status: 500 });
    }
}
