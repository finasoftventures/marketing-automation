import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const vanityName = req.nextUrl.searchParams.get("vanityName");
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

    if (!vanityName) return NextResponse.json({ error: "vanityName param required" }, { status: 400 });
    if (!accessToken) return NextResponse.json({ error: "No access token" }, { status: 500 });

    const res = await fetch(
        `https://api.linkedin.com/v2/organizations?q=vanityName&vanityName=${vanityName}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "X-Restli-Protocol-Version": "2.0.0",
            },
        }
    );
    const data = await res.json();
    return NextResponse.json(data);
}
