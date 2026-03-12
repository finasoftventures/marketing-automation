import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/social-tokens";
import { GoogleAuth } from "google-auth-library";
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

// GET /api/youtube/video-status?jobId=...&operationName=...
export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const operationName = searchParams.get("operationName");

  if (!operationName) {
    return NextResponse.json({ error: "Missing operationName" }, { status: 400 });
  }

  const location = process.env.GOOGLE_LOCATION ?? "us-central1";

  try {
    const token = await getVertexToken();
    
    // The correct endpoint for Publisher Models is a POST to :fetchPredictOperation
    const modelMatch = operationName.match(/\/models\/([^/]+)/);
    const modelId = modelMatch ? modelMatch[1] : "veo-3.1-generate-001";
    
    const pollUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/${location}/publishers/google/models/${modelId}:fetchPredictOperation`;
    
    const pollRes = await fetch(pollUrl, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ operationName })
    });

    if (!pollRes.ok) {
        const errText = await pollRes.text();
        throw new Error(`Polling request failed with status ${pollRes.status}: ${errText}`);
    }

    const pollData = await pollRes.json();

    if (pollData.error) {
      // Mark as failed in DB only if we have a valid jobId
      if (jobId && jobId !== 'null' && jobId !== 'undefined') {
        try {
          await serviceClient()
            .from("youtube_videos")
            .update({ status: "failed", error: pollData.error.message || "Unknown error" })
            .eq("id", jobId)
            .eq("user_id", userId);
        } catch { /* non-blocking */ }
      }
      return NextResponse.json({ done: true, error: pollData.error });
    }

    if (pollData.done) {
      // Operation finished successfully
      // The video output depends on Veo's response structure
      // Wait for test-veo.mjs output to fill this in properly
      let videoUrl = ""; 
      const response = pollData.response || {};
      
      // Veo 3.1 usually returns bytesBase64Encoded in the response.
      // But we will figure out exactly what it returns shortly.
      
      return NextResponse.json({ done: true, videoUrl, response });
    }

    return NextResponse.json({ done: false });

  } catch (err) {
    return NextResponse.json({ error: "Failed to check video status", detail: String(err) }, { status: 500 });
  }
}
