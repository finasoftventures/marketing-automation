import { NextResponse } from "next/server";

// GET /api/cron/plan - CRON: Generate weekly content plan
export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // In production:
        // 1. Check world scan insights
        // 2. Call Vertex AI to create weekly plan
        // 3. Insert into content_plan table
        console.log("[CRON] Content planning running...");
        return NextResponse.json({ success: true, plans_created: 5 });
    } catch {
        return NextResponse.json({ error: "Planning failed" }, { status: 500 });
    }
}
