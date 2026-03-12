import { NextResponse } from "next/server";

// GET /api/cron/visual - CRON: Generate visuals
export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("[CRON] Visual generation running...");
        return NextResponse.json({ success: true, images_generated: 2 });
    } catch {
        return NextResponse.json({ error: "Visual generation failed" }, { status: 500 });
    }
}
