import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUserId, getLinkedInToken } from "@/lib/social-tokens";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const { text, topic, imageB64, pdfB64 } = await req.json();

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let accessToken: string;
  try {
    accessToken = await getLinkedInToken(userId);
  } catch (e: any) {
    return NextResponse.json({ error: e.message, redirect: "/settings/connections" }, { status: 403 });
  }

  // Robust fetch wrapper to handle transient network timeouts
  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        
        // Don't retry on 4xx errors, only network or 5xx
        if (res.ok || (res.status >= 400 && res.status < 500)) return res;
      } catch (err: any) {
        if (i === retries - 1) throw err;
        console.warn(`[LinkedIn Network Retry ${i + 1}/${retries}] ${url} failed:`, err.message);
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // Exponential backoff
      }
    }
    throw new Error(`Failed to fetch ${url} after ${retries} retries`);
  };

  try {
    // Step 1: Get personal LinkedIn URN from /userinfo
    const userRes = await fetchWithRetry("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      const err = await userRes.text();
      console.error("[LinkedIn] Failed to fetch profile:", err);
      return NextResponse.json({ error: "Failed to fetch LinkedIn profile", detail: err }, { status: 400 });
    }
    const profile = await userRes.json();
    
    // Always use personal profile URN — organization posting requires specific LinkedIn Partner Program access
    const authorUrn = `urn:li:person:${profile.sub}`;
    const profileName = profile.name ?? "LinkedIn User";

    console.log("[LinkedIn] Posting as:", authorUrn);

    // Step 2: Handle Upload (PDF Document or Image)
    let shareMediaCategory = "NONE";
    let mediaArr: any[] = [];

    if (pdfB64) {
      // Register document asset using modern /rest/documents API
      const regRes = await fetchWithRetry("https://api.linkedin.com/rest/documents?action=initializeUpload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Linkedin-Version": "202601", // Active version based on 2026 docs
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: authorUrn,
          },
        }),
      });

      if (!regRes.ok) {
        const errText = await regRes.text();
        console.error("[LinkedIn Document Initialize Error]:", errText);
        return NextResponse.json({ error: `LinkedIn Doc Initialize failed: ${errText}` }, { status: 400 });
      } else {
        const regData = await regRes.json();
        const uploadUrl = regData.value.uploadUrl;
        const documentUrn = regData.value.document;

        const binaryData = Buffer.from(pdfB64, "base64");
        const upRes = await fetchWithRetry(uploadUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/octet-stream",
            "Linkedin-Version": "202601",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: binaryData,
        });

        if (!upRes.ok) {
          const errText = await upRes.text();
          console.error("[LinkedIn Document Upload Error]:", errText);
          return NextResponse.json({ error: `LinkedIn Doc Upload failed: ${errText}` }, { status: 400 });
        } else {
          shareMediaCategory = "NATIVE_DOCUMENT";
          mediaArr = [{
            status: "READY",
            description: { text: "AI Generated Carousel" },
            media: documentUrn,
            title: { text: "Carousel" },
          }];
        }
      }
    } else if (imageB64) {
      // Register image asset
      const regRes = await fetchWithRetry("https://api.linkedin.com/v2/assets?action=registerUpload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: authorUrn,
            serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
          },
        }),
      });

      if (!regRes.ok) {
        const errText = await regRes.text();
        console.error("[LinkedIn Image Register Error]:", errText);
        return NextResponse.json({ error: `LinkedIn Image Register failed: ${errText}` }, { status: 400 });
      } else {
        const regData = await regRes.json();
        const uploadUrl = regData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
        const assetUrn = regData.value.asset;

        const binaryData = Buffer.from(imageB64, "base64");
        const upRes = await fetchWithRetry(uploadUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/octet-stream",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: binaryData,
        });

        if (!upRes.ok) {
          const errText = await upRes.text();
          console.error("[LinkedIn Image Upload Error]:", errText);
          return NextResponse.json({ error: `LinkedIn Image Upload failed: ${errText}` }, { status: 400 });
        } else {
          shareMediaCategory = "IMAGE";
          mediaArr = [{
            status: "READY",
            description: { text: "AI Generated Image" },
            media: assetUrn,
            title: { text: "Generated Visual" },
          }];
        }
      }
    }

    // Step 3: Post to LinkedIn based on media type
    let linkedinPostId = null;

    if (shareMediaCategory === "NATIVE_DOCUMENT") {
      const documentUrn = mediaArr[0].media;
      const postBody = {
        author: authorUrn,
        commentary: text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        content: {
          media: {
            title: "Carousel Document",
            id: documentUrn
          }
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false
      };

      const postRes = await fetchWithRetry("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Linkedin-Version": "202601",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(postBody),
      });

      if (!postRes.ok) {
        const errText = await postRes.text();
        console.error("[LinkedIn Rest/Posts Failed]:", errText);
        return NextResponse.json({ error: `LinkedIn post failed: ${errText}` }, { status: 400 });
      }

      linkedinPostId = postRes.headers.get("x-restli-id") || null;
      console.log("[LinkedIn] Successfully posted document:", linkedinPostId);

    } else {
      // Legacy v2/ugcPosts for plain text or images
      const postBody = {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory,
            ...((shareMediaCategory === "IMAGE") ? { media: mediaArr } : {}),
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      };

      const postRes = await fetchWithRetry("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(postBody),
      });

      const postData = await postRes.json();

      if (!postRes.ok) {
        const msg = postData.message || postData.serviceErrorCode
          ? `${postData.message} (code: ${postData.serviceErrorCode})`
          : JSON.stringify(postData);
        console.error("[LinkedIn Post Failed]:", msg, postData);
        return NextResponse.json({ error: `LinkedIn post failed: ${msg}`, detail: postData }, { status: 400 });
      }

      linkedinPostId = postData.id ?? null;
      console.log("[LinkedIn] Successfully posted image/text:", linkedinPostId);
    }

    // Step 4: Save to Supabase (non-blocking)
    try {
      await serviceClient().from("linkedin_posts").insert({
        user_id: userId,
        topic: topic ?? null,
        text_content: text,
        image_b64: imageB64 ? imageB64.slice(0, 50000) : null,
        linkedin_post_id: linkedinPostId,
        platform_post_id: linkedinPostId,
        posted_at: new Date().toISOString(),
        status: "published",
      });
    } catch {
      /* non-blocking */
    }

    return NextResponse.json({
      success: true,
      postId: linkedinPostId,
      profile: { name: profileName, type: "person" },
    });

  } catch (err) {
    console.error("[LinkedIn API Critical Error]:", err);
    return NextResponse.json({ error: "Request failed", detail: String(err) }, { status: 500 });
  }
}
