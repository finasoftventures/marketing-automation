import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, getYouTubeTokens, refreshYouTubeToken } from "@/lib/social-tokens";
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

async function getFreshYouTubeToken(userId: string): Promise<string> {
  const tokens = await getYouTubeTokens(userId);
  
  // Check if access token is expired (or will expire in next 60s)
  const isExpired = tokens.expiresAt 
    ? new Date(tokens.expiresAt).getTime() - 60000 < Date.now()
    : false;
  
  if (isExpired && tokens.refreshToken) {
    console.log("[YouTube] Access token expired, refreshing...");
    return refreshYouTubeToken(userId, tokens.refreshToken);
  }
  
  return tokens.accessToken;
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { videoUrl, title, description, topic, jobId, operationName: passedOperationName } = await req.json();

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!jobId && !passedOperationName) {
    return NextResponse.json({ error: "jobId or operationName is required" }, { status: 400 });
  }

  let ytAccessToken: string;
  try {
    ytAccessToken = await getFreshYouTubeToken(userId);
    console.log("[YouTube Upload] Got access token, length:", ytAccessToken.length);
  } catch (e: any) {
    console.error("[YouTube Upload] Token error:", e.message);
    return NextResponse.json({ error: `YouTube not connected: ${e.message}`, redirect: "/settings/connections" }, { status: 403 });
  }

  try {
    let videoBuffer: Buffer;
    let resolvedOperationName: string;
    
    // 1. Resolve operation name — from DB if we have jobId, otherwise use directly passed operationName
    if (jobId) {
      const { data: jobRow, error: dbErr } = await serviceClient()
        .from("youtube_videos")
        .select("operation_name")
        .eq("id", jobId)
        .single();

      if (dbErr || !jobRow?.operation_name) {
        console.error("[YouTube Upload] DB lookup failed:", dbErr);
        if (passedOperationName) {
          console.log("[YouTube Upload] Falling back to passed operationName:", passedOperationName);
          resolvedOperationName = passedOperationName;
        } else {
          throw new Error("Could not find video operation in database and no fallback operationName provided.");
        }
      } else {
        resolvedOperationName = jobRow.operation_name;
      }
    } else if (passedOperationName) {
      console.log("[YouTube Upload] No jobId, using passed operationName:", passedOperationName);
      resolvedOperationName = passedOperationName;
    } else {
      throw new Error("No jobId or operationName provided.");
    }
    
    console.log("[YouTube Upload] Fetching from Vertex AI, operation:", resolvedOperationName);
    const token = await getVertexToken();
    const location = process.env.GOOGLE_LOCATION ?? "us-central1";
    const modelMatch = resolvedOperationName.match(/\/models\/([^/]+)/);
    const modelId = modelMatch ? modelMatch[1] : "veo-3.1-generate-001";
    
    const pollUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/${location}/publishers/google/models/${modelId}:fetchPredictOperation`;
    
    const pollRes = await fetch(pollUrl, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ operationName: resolvedOperationName })
    });

    if (!pollRes.ok) {
       const errText = await pollRes.text();
       throw new Error(`Vertex AI fetch failed (${pollRes.status}): ${errText}`);
    }

    const pollData = await pollRes.json();
    if (!pollData.done || !pollData.response) {
       throw new Error("Video is not finished generating yet in Vertex AI.");
    }

    console.log("[YouTube Upload] Got Vertex response, extracting video...");

    const responseData = pollData.response;
    let base64Data = "";
    
    if (responseData?.response?.videos?.[0]?.bytesBase64Encoded) {
      base64Data = responseData.response.videos[0].bytesBase64Encoded;
    } else if (responseData?.videos?.[0]?.bytesBase64Encoded) {
      base64Data = responseData.videos[0].bytesBase64Encoded;
    }
    
    if (base64Data) {
      videoBuffer = Buffer.from(base64Data, "base64");
      console.log("[YouTube Upload] Video buffer size:", videoBuffer.length, "bytes");
    } else if (videoUrl && !videoUrl.startsWith("data:")) {
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error("Failed to fetch video from backup URL");
      videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    } else {
      throw new Error("No video data found in Vertex AI response.");
    }

    // 2. Initiate YouTube resumable upload
    console.log("[YouTube Upload] Initiating resumable upload to YouTube...");
    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ytAccessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": "video/mp4",
          "X-Upload-Content-Length": String(videoBuffer.length),
        },
        body: JSON.stringify({
          snippet: {
            title: title.slice(0, 100),
            description: description ?? title,
            tags: ["AutoPilot", "AI", topic ?? "content"].filter(Boolean),
            categoryId: "22",
          },
          status: { privacyStatus: "public" },
        }),
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.error("[YouTube Upload] Resumable init failed:", initRes.status, errText);
      
      // Surface meaningful error
      let userMsg = `YouTube upload failed (${initRes.status})`;
      try {
        const errJson = JSON.parse(errText);
        userMsg = errJson?.error?.message ?? userMsg;
        const reason = errJson?.error?.errors?.[0]?.reason;
        if (reason === "insufficientPermissions") {
          userMsg = "YouTube upload permission denied. Please reconnect YouTube and grant 'Manage your YouTube videos' permission.";
        } else if (reason === "youtubeSignupRequired") {
          userMsg = "Your Google account needs a YouTube channel. Please create one at youtube.com first.";
        } else if (reason === "quotaExceeded") {
          userMsg = "YouTube API daily quota exceeded. Please try again tomorrow.";
        }
      } catch {}
      
      throw new Error(userMsg);
    }

    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) throw new Error("No resumable upload URL returned from YouTube");

    // 3. Upload video bytes  
    console.log("[YouTube Upload] Uploading video bytes...");
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(videoBuffer.length),
      },
      body: new Uint8Array(videoBuffer),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("[YouTube Upload] Byte upload failed:", uploadRes.status, errText);
      throw new Error(`YouTube upload failed (${uploadRes.status}): ${errText.slice(0, 200)}`);
    }

    const uploadData = await uploadRes.json();
    const videoId = uploadData.id;
    console.log("[YouTube Upload] SUCCESS! Video ID:", videoId);

    // 4. Update DB record
    if (jobId) {
      await serviceClient()
        .from("youtube_videos")
        .update({
          youtube_video_id: videoId,
          status: "published",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId)
        .eq("user_id", userId);
    }

    return NextResponse.json({
      success: true,
      videoId,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });

  } catch (err: any) {
    console.error("[YouTube API Critical Error]:", err.message ?? err);
    if (jobId) {
      await serviceClient()
        .from("youtube_videos")
        .update({ status: "failed", error: err.message ?? String(err) })
        .eq("id", jobId)
        .eq("user_id", userId);
    }
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
