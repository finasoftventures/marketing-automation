import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// ─── Supabase Service Client (server-side, bypasses RLS) ─────────────────────
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Supabase Auth Client (reads session from cookies) ────────────────────────
export async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
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
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Get LinkedIn Token for a user ────────────────────────────────────────────
export async function getLinkedInToken(userId: string): Promise<string> {
  const { data, error } = await serviceClient()
    .from("social_accounts")
    .select("access_token_encrypted, expires_at")
    .eq("user_id", userId)
    .eq("platform", "linkedin")
    .eq("status", "active")
    .single();

  if (error || !data) {
    throw new Error("linkedin_not_connected");
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // Mark as expired in DB
    await serviceClient()
      .from("social_accounts")
      .update({ status: "expired" })
      .eq("user_id", userId)
      .eq("platform", "linkedin");
    throw new Error("linkedin_token_expired");
  }

  return data.access_token_encrypted;
}

// ─── Get YouTube Tokens for a user ────────────────────────────────────────────
interface YouTubeTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}

export async function getYouTubeTokens(userId: string): Promise<YouTubeTokens> {
  const { data, error } = await serviceClient()
    .from("social_accounts")
    .select("access_token_encrypted, refresh_token_encrypted, expires_at")
    .eq("user_id", userId)
    .eq("platform", "youtube")
    .eq("status", "active")
    .single();

  if (error || !data) {
    // Attempt auto-connect via master Google Session token
    try {
      const { createServerClient } = await import("@supabase/ssr");
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
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
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.provider_token) {
         // We found a Google OAuth provider token in the session! 
         // Save it to social_accounts so background cron jobs can use it.
         const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
         
         await saveSocialToken(userId, "youtube", {
            accessToken: session.provider_token,
            refreshToken: session.provider_refresh_token || undefined,
            expiresAt: expiresAt,
            accountName: session.user.user_metadata?.name || session.user.email,
            profilePicture: session.user.user_metadata?.avatar_url,
         });

         return {
            accessToken: session.provider_token,
            refreshToken: session.provider_refresh_token ?? null,
            expiresAt: expiresAt,
         };
      }
    } catch (e) {}

    throw new Error("youtube_not_connected");
  }

  // Auto-refresh if expired
  const isExpired = data.expires_at && new Date(data.expires_at) <= new Date();
  if (isExpired && data.refresh_token_encrypted) {
    const newToken = await refreshYouTubeToken(userId, data.refresh_token_encrypted);
    return { accessToken: newToken, refreshToken: data.refresh_token_encrypted, expiresAt: null };
  }

  return {
    accessToken: data.access_token_encrypted,
    refreshToken: data.refresh_token_encrypted ?? null,
    expiresAt: data.expires_at ?? null,
  };
}

// ─── Refresh YouTube Access Token ─────────────────────────────────────────────
export async function refreshYouTubeToken(userId: string, refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube token refresh failed: ${err}`);
  }

  const data = await res.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  // Update token in DB
  await serviceClient()
    .from("social_accounts")
    .update({
      access_token_encrypted: data.access_token,
      expires_at: expiresAt,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("platform", "youtube");

  return data.access_token;
}

// ─── Save Social Account Token ────────────────────────────────────────────────
export async function saveSocialToken(
  userId: string,
  platform: "linkedin" | "youtube",
  data: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    accountName?: string;
    accountId?: string;
    channelTitle?: string;
    profilePicture?: string;
  }
) {
  await serviceClient()
    .from("social_accounts")
    .upsert(
      {
        user_id: userId,
        platform,
        access_token_encrypted: data.accessToken,
        refresh_token_encrypted: data.refreshToken ?? null,
        expires_at: data.expiresAt ?? null,
        platform_account_id: data.accountId ?? null,
        platform_account_name: data.accountName ?? data.channelTitle ?? null,
        profile_picture: data.profilePicture ?? null,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" }
    );
}

// ─── Check which platforms a user has connected ───────────────────────────────
export async function getConnectedPlatforms(userId: string) {
  let { data } = await serviceClient()
    .from("social_accounts")
    .select("platform, platform_account_name, expires_at, status, profile_picture")
    .eq("user_id", userId)
    .in("platform", ["linkedin", "youtube"]);

  const linkedin = data?.find(d => d.platform === "linkedin") ?? null;
  let youtube = data?.find(d => d.platform === "youtube") ?? null;

  if (!youtube) {
    try {
      await getYouTubeTokens(userId);
      const { data: updatedData } = await serviceClient()
        .from("social_accounts")
        .select("platform, platform_account_name, expires_at, status, profile_picture")
        .eq("user_id", userId)
        .eq("platform", "youtube");
      youtube = updatedData?.find(d => d.platform === "youtube") ?? null;
    } catch (e) {}
  }

  return { linkedin, youtube };
}
