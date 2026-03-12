import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data, error } = await supabase
            .from("linkedin_posts")
            .select("id, topic, text_content, image_url, image_b64, linkedin_post_id, posted_at, status")
            .order("posted_at", { ascending: false })
            .limit(30);

        if (error) {
            return NextResponse.json({ error: "Failed to fetch posts", detail: error.message }, { status: 500 });
        }

        return NextResponse.json({ posts: data ?? [] });
    } catch (err) {
        return NextResponse.json({ error: "Fetch failed", detail: String(err) }, { status: 500 });
    }
}
