import { NextRequest, NextResponse } from "next/server";
import { getVertexToken, generateSlideImage } from "@/lib/carousel-image";

export async function POST(req: NextRequest) {
  try {
    const { imagePrompt, slideIndex = 0 } = await req.json();
    if (!imagePrompt) return NextResponse.json({ error: "imagePrompt required" }, { status: 400 });
    const token = await getVertexToken();
    const imageB64 = await generateSlideImage(imagePrompt, slideIndex + 1, token);
    return NextResponse.json({ imageB64 });
  } catch (err: any) {
    console.error("[retry-image]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
