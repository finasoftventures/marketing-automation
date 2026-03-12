import { NextResponse } from "next/server";

export async function GET() {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

    if (!accessToken) {
        return NextResponse.json({ error: "No LINKEDIN_ACCESS_TOKEN in env" }, { status: 500 });
    }

    try {
        // First get the user's URN
        const userRes = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userRes.ok) {
            return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 400 });
        }

        const user = await userRes.json();
        const authorUrn = encodeURIComponent(`urn:li:person:${user.sub}`);

        // Fetch recent posts by this author
        const postsRes = await fetch(
            `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${authorUrn})&count=20&sortBy=LAST_MODIFIED`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            }
        );

        if (!postsRes.ok) {
            const err = await postsRes.text();
            return NextResponse.json({ error: "Failed to fetch posts", detail: err }, { status: 400 });
        }

        const postsData = await postsRes.json();
        const posts = (postsData.elements ?? []).map((p: any) => ({
            id: p.id,
            text: p.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text ?? "",
            createdAt: p.created?.time ? new Date(p.created.time).toISOString() : null,
            lifecycleState: p.lifecycleState,
        }));

        return NextResponse.json({ posts, author: { name: user.name, picture: user.picture } });
    } catch (err) {
        return NextResponse.json({ error: "Request failed", detail: String(err) }, { status: 500 });
    }
}
