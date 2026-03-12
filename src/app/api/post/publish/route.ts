import { NextResponse } from "next/server";

// POST /api/post/publish - Publish to social platforms
export async function POST(request: Request) {
    try {
        const { postId, platform } = await request.json();
        // In production: call LinkedIn/Instagram APIs to publish
        return NextResponse.json({
            success: true,
            platform_post_id: `mock_${platform}_${Date.now()}`,
            published_at: new Date().toISOString(),
        });
    } catch {
        return NextResponse.json({ error: "Publishing failed" }, { status: 500 });
    }
}
