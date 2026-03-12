import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const { prompt, item_slug } = await req.json();
    if (!prompt || !item_slug) {
      return NextResponse.json({ error: "prompt and item_slug required" }, { status: 400 });
    }

    // Use Gemini REST API directly for image generation
    // The @google/generative-ai SDK doesn't fully support responseModalities
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = (errorData as any)?.error?.message || `Gemini API error: ${response.status}`;
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];

    // Find inline image data
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
    if (!imagePart?.inlineData) {
      return NextResponse.json({ error: "No image generated. Try a more descriptive prompt." }, { status: 500 });
    }

    const base64 = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType;

    return NextResponse.json({
      success: true,
      image_data: `data:${mimeType};base64,${base64}`,
      item_slug,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
