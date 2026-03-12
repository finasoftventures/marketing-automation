import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

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

// POST: Start the video generation
export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });

    const token = await getVertexToken();
    const location = process.env.GOOGLE_LOCATION || "us-central1";
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/veo-3.1-generate-001:predictLongRunning`;

    const body = {
      instances: [{ prompt }],
      parameters: {
        aspectRatio: "16:9",
        durationSeconds: 8,
        sampleCount: 1,
        resolution: "1080p",
      },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: "Vertex AI Error", detail: errText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, operationName: data.name, rawResponse: data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: Poll operation status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const operationName = searchParams.get("operationName");
    if (!operationName) return NextResponse.json({ error: "Missing operationName" }, { status: 400 });

    const token = await getVertexToken();
    const location = process.env.GOOGLE_LOCATION || "us-central1";
    const projectId = process.env.GOOGLE_PROJECT_ID;
    
    // The correct endpoint for Publisher Models is a POST to :fetchPredictOperation
    // Extract model ID from operationName if possible, or use default
    // Name format: projects/.../locations/.../publishers/google/models/[MODEL_ID]/operations/[OP_ID]
    const modelMatch = operationName.match(/\/models\/([^/]+)/);
    const modelId = modelMatch ? modelMatch[1] : "veo-3.1-generate-001";
    
    const pollUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:fetchPredictOperation`;
    
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
        return NextResponse.json({ 
            done: false, 
            error: "Polling request failed", 
            detail: errText,
            urlTried: pollUrl 
        }, { status: pollRes.status });
    }

    const successData = await pollRes.json();
    return NextResponse.json({ 
        done: successData.done || false, 
        response: successData,
        message: successData.done ? "Polling complete" : "Processing..."
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
