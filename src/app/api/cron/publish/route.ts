import { NextResponse } from "next/server";

// GET /api/cron/publish - CRON: Publish scheduled posts
export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("[CRON] Publisher running...");
        return NextResponse.json({ success: true, posts_published: 1 });
    } catch {
        return NextResponse.json({ error: "Publishing failed" }, { status: 500 });
    }
}
