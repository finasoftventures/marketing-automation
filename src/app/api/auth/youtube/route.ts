import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const clientId = process.env.YOUTUBE_CLIENT_ID!;

  if (!clientId) {
    return NextResponse.json({ error: "YouTube OAuth not configured" }, { status: 500 });
  }

  const redirectUri = `${appUrl}/api/auth/youtube/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    access_type: "offline",
    prompt: "consent",
  });

  const state = crypto.randomUUID();
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}&state=${state}`;

  const response = NextResponse.redirect(authUrl);
  const cookieStore = await cookies();
  response.cookies.set("youtube_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 900,
    path: "/",
  });

  return response;
}
