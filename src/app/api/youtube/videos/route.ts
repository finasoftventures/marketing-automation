import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/social-tokens";
import { createClient } from "@supabase/supabase-js";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/youtube/videos — list videos for current user
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data: videos } = await serviceClient()
    .from("youtube_videos")
    .select("id, title, status, youtube_video_id, error, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ videos: videos ?? [] });
}
