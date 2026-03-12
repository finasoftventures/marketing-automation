import { NextResponse } from "next/server";
import { getSessionUserId, getConnectedPlatforms } from "@/lib/social-tokens";

// GET /api/settings/connections
// Returns connected platform info for the current user
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { linkedin, youtube } = await getConnectedPlatforms(userId);

  return NextResponse.json({
    linkedin: {
      platform: "linkedin",
      status: linkedin ? linkedin.status : "disconnected",
      connected: !!linkedin && linkedin.status === "active",
      accountName: linkedin?.platform_account_name ?? null,
      profilePicture: linkedin?.profile_picture ?? null,
      expiresAt: linkedin?.expires_at ?? null,
    },
    youtube: {
      platform: "youtube",
      status: youtube ? youtube.status : "disconnected",
      connected: !!youtube && youtube.status === "active",
      channelTitle: youtube?.platform_account_name ?? null,
      profilePicture: youtube?.profile_picture ?? null,
      expiresAt: youtube?.expires_at ?? null,
    }
  });
}

// DELETE /api/settings/connections?platform=linkedin|youtube
export async function DELETE(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  if (!platform || !["linkedin", "youtube"].includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await db
    .from("social_accounts")
    .update({ status: "revoked", access_token_encrypted: "", refresh_token_encrypted: "" })
    .eq("user_id", userId)
    .eq("platform", platform);

  return NextResponse.json({ success: true });
}
