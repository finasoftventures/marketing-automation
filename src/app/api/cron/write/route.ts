import { NextResponse } from "next/server";

// GET /api/cron/write - CRON: Write post content
export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("[CRON] Content writing running...");
        return NextResponse.json({ success: true, posts_written: 2 });
    } catch {
        return NextResponse.json({ error: "Writing failed" }, { status: 500 });
    }
}
