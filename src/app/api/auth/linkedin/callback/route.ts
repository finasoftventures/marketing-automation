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
    return NextResponse.redirect(`${appUrl}/settings/connections?error=linkedin_denied`);
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const storedState = cookieStore.get("linkedin_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${appUrl}/settings/connections?error=invalid_state`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${appUrl}/api/auth/linkedin/callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("[LinkedIn OAuth] Token exchange failed:", tokenRes.status, err);
      return NextResponse.redirect(`${appUrl}/settings/connections?error=token_${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in ?? 5184000; // 60 days default
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 2. Fetch LinkedIn profile
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
    const profile = profileRes.ok ? await profileRes.json() : {};

    // 3. Get current Supabase user
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

    // 4. Save to Supabase social_accounts
    await saveSocialToken(user.id, "linkedin", {
      accessToken,
      expiresAt,
      accountName: profile.name ?? null,
      accountId: profile.sub ?? null,
      profilePicture: profile.picture ?? null,
    });

    // 5. Clean up state cookie
    const response = NextResponse.redirect(`${appUrl}/settings/connections?connected=linkedin`);
    response.cookies.delete("linkedin_oauth_state");
    return response;

  } catch (err: any) {
    const code = err?.cause?.code ?? err?.code ?? "unknown";
    const message = err?.message ?? String(err);
    console.error("[LinkedIn OAuth Callback] Error:", { code, message, cause: err?.cause });
    // If DNS/network error, give a clear redirect code
    if (code === "ENOTFOUND" || code === "ECONNREFUSED" || code === "UND_ERR_CONNECT_TIMEOUT") {
      return NextResponse.redirect(`${appUrl}/settings/connections?error=network_error`);
    }
    return NextResponse.redirect(`${appUrl}/settings/connections?error=${code}`);
  }
}
