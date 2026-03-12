import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// This cron runs every 4 hours via Vercel Cron (see vercel.json)
// It fetches the latest reactions/comments/reposts for each user's recent posts
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = serviceClient();

  // Get all users with active LinkedIn tokens
  const { data: accounts } = await db
    .from("social_accounts")
    .select("user_id, access_token_encrypted")
    .eq("platform", "linkedin")
    .eq("status", "active");

  if (!accounts?.length) {
    return NextResponse.json({ synced: 0, message: "No active LinkedIn accounts" });
  }

  let synced = 0;
  const errors: string[] = [];

  for (const account of accounts) {
    try {
      // Get last 7 days of posts for this user
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: posts } = await db
        .from("linkedin_posts")
        .select("id, linkedin_post_id, posted_at")
        .eq("user_id", account.user_id)
        .eq("status", "published")
        .gte("posted_at", since)
        .not("linkedin_post_id", "is", null);

      if (!posts?.length) continue;

      for (const post of posts) {
        try {
          // LinkedIn socialActions API — fetches reactions, comments, shares
          // Note: impressions require LinkedIn Partner/CMA approval
          const urn = encodeURIComponent(`urn:li:ugcPost:${post.linkedin_post_id}`);
          const statsRes = await fetch(
            `https://api.linkedin.com/v2/socialActions/${urn}`,
            { headers: { Authorization: `Bearer ${account.access_token_encrypted}` } }
          );

          if (!statsRes.ok) continue;

          const stats = await statsRes.json();
          const likes = stats.likesSummary?.totalLikes ?? 0;
          const comments = stats.commentsSummary?.totalFirstLevelComments ?? 0;

          // Also get share count
          const shareRes = await fetch(
            `https://api.linkedin.com/v2/socialActions/${urn}/shares`,
            { headers: { Authorization: `Bearer ${account.access_token_encrypted}` } }
          );
          const shares = shareRes.ok ? ((await shareRes.json()).paging?.total ?? 0) : 0;

          // Upsert into post_history
          await db.from("post_history").upsert(
            {
              generated_post_id: post.id,
              user_id: account.user_id,
              platform: "linkedin",
              platform_post_urn: `urn:li:ugcPost:${post.linkedin_post_id}`,
              likes,
              comments,
              shares,
              fetched_at: new Date().toISOString(),
              published_at: post.posted_at,
            },
            { onConflict: "user_id,platform_post_urn" }
          );

          synced++;
        } catch (postErr) {
          // Non-blocking per-post error
          errors.push(`Post ${post.linkedin_post_id}: ${String(postErr)}`);
        }
      }
    } catch (userErr) {
      errors.push(`User ${account.user_id}: ${String(userErr)}`);
    }
  }

  return NextResponse.json({
    synced,
    errors: errors.length ? errors : undefined,
    synced_at: new Date().toISOString(),
  });
}
