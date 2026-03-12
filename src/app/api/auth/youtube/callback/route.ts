import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { saveSocialToken } from "@/lib/social-tokens";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code) {
    console.error("[YouTube OAuth] Denied or no code:", error);
    return NextResponse.redirect(`${appUrl}/settings/connections?error=youtube_denied`);
  }

  // CSRF validation
  const cookieStore = await cookies();
  const storedState = cookieStore.get("youtube_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${appUrl}/settings/connections?error=invalid_state`);
  }

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.YOUTUBE_CLIENT_ID!,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/youtube/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("[YouTube Callback] Token exchange failed:", err);
      return NextResponse.redirect(`${appUrl}/settings/connections?error=yt_token_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;
    const expiresIn: number = tokenData.expires_in ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    if (!accessToken) {
      return NextResponse.redirect(`${appUrl}/settings/connections?error=no_access_token`);
    }

    // 2. Get channel info
    let channelTitle = "My YouTube Channel";
    let channelId = "";
    let profilePicture = "";
    try {
      const chanRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (chanRes.ok) {
        const chanData = await chanRes.json();
        const channel = chanData.items?.[0];
        if (channel) {
          channelTitle = channel.snippet?.title ?? channelTitle;
          channelId = channel.id ?? "";
          profilePicture = channel.snippet?.thumbnails?.default?.url ?? "";
        }
      }
    } catch { /* non-blocking */ }

    // 3. Get current Supabase user (server-side)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${appUrl}/login?error=not_authenticated`);
    }

    // 4. Save tokens using service role (bypasses RLS!)
    await saveSocialToken(user.id, "youtube", {
      accessToken,
      refreshToken,
      expiresAt,
      accountName: channelTitle,
      accountId: channelId,
      profilePicture,
    });

    console.log("[YouTube Callback] Successfully linked YouTube for user:", user.id);

    // 5. Clean up cookie and redirect
    const response = NextResponse.redirect(`${appUrl}/settings/connections?connected=youtube`);
    response.cookies.delete("youtube_oauth_state");
    return response;

  } catch (err) {
    console.error("[YouTube OAuth Callback] Error:", err);
    return NextResponse.redirect(`${appUrl}/settings/connections?error=yt_unknown`);
  }
}
