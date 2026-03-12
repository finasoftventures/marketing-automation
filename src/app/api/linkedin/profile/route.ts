import { NextResponse } from "next/server";
import { getSessionUserId, getLinkedInToken } from "@/lib/social-tokens";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    let accessToken: string;
    try {
      accessToken = await getLinkedInToken(userId);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }

    const res = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "Failed to fetch profile", detail: text }, { status: 400 });
    }

    const data = await res.json();
    return NextResponse.json({
      sub: data.sub,
      name: data.name,
      email: data.email,
      picture: data.picture,
    });
  } catch (err) {
    return NextResponse.json({ error: "Request failed", detail: String(err) }, { status: 500 });
  }
}
