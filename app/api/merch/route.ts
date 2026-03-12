import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"] as any,
      } as any,
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];

    // Find inline image data
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
    if (!imagePart || !("inlineData" in imagePart) || !imagePart.inlineData) {
      return NextResponse.json({ error: "No image generated. Try again." }, { status: 500 });
    }

    // Return base64 image directly — no storage dependency
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
