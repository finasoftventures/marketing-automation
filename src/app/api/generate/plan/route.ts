import { NextResponse } from "next/server";

// POST /api/generate/plan - AI Content Plan
export async function POST(request: Request) {
    try {
        const body = await request.json();
        // In production: Call Vertex AI (Gemini) to generate content plan
        return NextResponse.json({
            success: true,
            plan: {
                topics: [
                    { topic: "5 Pitch Deck Mistakes Investors Hate", pillar: "tips", platform: "both", day: "2025-01-15" },
                    { topic: "How Sarah Found Her Investor in 2 Weeks", pillar: "stories", platform: "both", day: "2025-01-16" },
                    { topic: "InvestorRaise Smart Match Launch", pillar: "product", platform: "both", day: "2025-01-17" },
                ],
            },
        });
    } catch {
        return NextResponse.json({ error: "Plan generation failed" }, { status: 500 });
    }
}
