import { NextResponse } from "next/server";

// POST /api/post/approve
export async function POST(request: Request) {
    try {
        const { postId } = await request.json();
        // In production: update post status in Supabase
        return NextResponse.json({ success: true, status: "approved" });
    } catch {
        return NextResponse.json({ error: "Approval failed" }, { status: 500 });
    }
}
