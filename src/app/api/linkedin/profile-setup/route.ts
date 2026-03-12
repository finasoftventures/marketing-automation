import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — Load saved profile
export async function GET() {
    try {
        const { data, error } = await supabase()
            .from("linkedin_profiles")
            .select("*")
            .eq("user_id", "default")
            .single();

        if (error && error.code !== "PGRST116") { // PGRST116 = no rows
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ profile: data ?? null });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

// POST — Save or update profile
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, headline, niche, target_audience, tone, content_pillars, sample_posts, style_notes } = body;

        const { data, error } = await supabase()
            .from("linkedin_profiles")
            .upsert({
                user_id: "default",
                name: name ?? null,
                headline: headline ?? null,
                niche: niche ?? null,
                target_audience: target_audience ?? null,
                tone: tone ?? null,
                content_pillars: content_pillars ?? [],
                sample_posts: sample_posts ?? [],
                style_notes: style_notes ?? null,
                updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, profile: data });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
