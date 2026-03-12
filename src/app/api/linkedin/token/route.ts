import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { code } = await req.json();

    if (!code) {
        return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const params = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: "http://localhost:3000/linkedin-callback",
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    });

    try {
        const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: "Failed to exchange token", detail: String(err) }, { status: 500 });
    }
}
