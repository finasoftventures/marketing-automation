import { NextResponse } from "next/server";

// POST /api/auth/callback
export async function POST(request: Request) {
    try {
        const { code, provider } = await request.json();
        // Supabase would exchange the code for a session here
        return NextResponse.json({ success: true, redirect: "/dashboard" });
    } catch {
        return NextResponse.json({ error: "Auth callback failed" }, { status: 500 });
    }
}
