import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { topic, text_content, image_url, image_b64, linkedin_post_id } = body;

        if (!text_content) {
            return NextResponse.json({ error: "text_content required" }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data, error } = await supabase
            .from("linkedin_posts")
            .insert({
                topic: topic ?? null,
                text_content,
                image_url: image_url ?? null,
                image_b64: image_b64 ? image_b64.slice(0, 50000) : null, // store first part as preview
                linkedin_post_id: linkedin_post_id ?? null,
                posted_at: new Date().toISOString(),
                status: "published",
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: "Failed to save post", detail: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, post: data });
    } catch (err) {
        return NextResponse.json({ error: "Save failed", detail: String(err) }, { status: 500 });
    }
}
