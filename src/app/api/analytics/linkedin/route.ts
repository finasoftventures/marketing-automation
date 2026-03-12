import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/social-tokens";
import { createClient } from "@supabase/supabase-js";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/analytics/linkedin
// Returns last 7 days of post analytics for the current user
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get recent posts
  const { data: posts } = await serviceClient()
    .from("linkedin_posts")
    .select("id, topic, posted_at, linkedin_post_id")
    .eq("user_id", userId)
    .eq("status", "published")
    .gte("posted_at", since)
    .order("posted_at", { ascending: false })
    .limit(20);

  // Get engagement from post_history — join on platform_post_urn
  // post_history stores urn:li:ugcPost:{linkedin_post_id}
  const urns = (posts ?? [])
    .filter(p => p.linkedin_post_id)
    .map(p => `urn:li:ugcPost:${p.linkedin_post_id}`);

  const { data: history } = urns.length
    ? await serviceClient()
        .from("post_history")
        .select("platform_post_urn, likes, comments, shares, fetched_at")
        .eq("user_id", userId)
        .eq("platform", "linkedin")
        .in("platform_post_urn", urns)
    : { data: [] };

  // Map history by URN for O(1) lookup
  const historyMap = new Map(
    (history ?? []).map(h => [h.platform_post_urn, h])
  );

  const enrichedPosts = (posts ?? []).map(p => {
    const urn = p.linkedin_post_id ? `urn:li:ugcPost:${p.linkedin_post_id}` : null;
    const h = urn ? historyMap.get(urn) : null;
    return {
      id: p.id,
      topic: p.topic,
      posted_at: p.posted_at,
      likes: h?.likes ?? 0,
      comments: h?.comments ?? 0,
      shares: h?.shares ?? 0,
    };
  });

  const summary = {
    posts7d: enrichedPosts.length,
    totalLikes: enrichedPosts.reduce((s, p) => s + p.likes, 0),
    totalComments: enrichedPosts.reduce((s, p) => s + p.comments, 0),
    totalShares: enrichedPosts.reduce((s, p) => s + p.shares, 0),
    fetchedAt: history?.at(0)?.fetched_at ?? null,
  };

  return NextResponse.json({ posts: enrichedPosts, summary });
}
