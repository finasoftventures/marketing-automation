import { GoogleAuth } from "google-auth-library";

export async function getVertexToken(): Promise<string> {
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

export const PROJECT_ID = () => process.env.GOOGLE_PROJECT_ID!;
export const VERTEX_REGION = "us-central1";

// ─── Generate one slide background image ──────────────────────────────────────
export async function generateSlideImage(
  imagePrompt: string,
  slideNum: number,
  token: string
): Promise<string> {
  // gemini-2.5-flash-image = Nano Banana 1 (GA, cheaper, fast, great quality)
  // Endpoint: global (as per official Vertex AI docs)
  const candidates = [
    {
      model: "gemini-2.5-flash-image",
      endpoint: `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID()}/locations/global/publishers/google/models/gemini-2.5-flash-image:generateContent`,
    },
    {
      // Preview version as fallback (deprecated but still functional)
      model: "gemini-2.5-flash-image-preview",
      endpoint: `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID()}/locations/global/publishers/google/models/gemini-2.5-flash-image-preview:generateContent`,
    },
    {
      // Last resort: older model on global endpoint
      model: "gemini-3-pro-image-preview",
      endpoint: `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID()}/locations/global/publishers/google/models/gemini-3-pro-image-preview:generateContent`,
    },
  ];

  for (const { model, endpoint } of candidates) {
    console.log(`[carousel] Slide ${slideNum}: trying model=${model}`);
    let delay = 5000;

    for (let attempt = 0; attempt < 3; attempt++) {
      let res: Response | undefined;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: { role: "user", parts: [{ text: imagePrompt }] },
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
          signal: AbortSignal.timeout(90000), // 90s timeout for image gen
        });
      } catch (err) {
        console.error(`[carousel] Slide ${slideNum} fetch error attempt ${attempt + 1}:`, err);
        if (attempt === 2) break; // Try next model
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      const rawBody = await res.text();
      console.log(`[carousel] Slide ${slideNum} attempt ${attempt + 1} status=${res.status} model=${model} preview=${rawBody.slice(0, 120)}`);

      if (res.ok) {
        let data: any;
        try { data = JSON.parse(rawBody); } catch { break; }
        for (const part of data.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.mimeType?.startsWith("image/")) {
            console.log(`[carousel] Slide ${slideNum} SUCCESS model=${model}`);
            return part.inlineData.data;
          }
        }
        console.warn(`[carousel] Slide ${slideNum} OK but no image part (model=${model}). Trying next.`);
        break;
      }

      if ((res.status === 429 || res.status === 503) && attempt < 2) {
        console.warn(`[carousel] Slide ${slideNum} rate limited (${res.status}), waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      } else {
        console.error(`[carousel] Slide ${slideNum} error ${res.status}: ${rawBody.slice(0, 200)}`);
        break;
      }
    }
  }

  throw new Error(`Could not generate image for slide ${slideNum} after all models/attempts`);
}
