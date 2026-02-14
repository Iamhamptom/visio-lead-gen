import { NextRequest, NextResponse } from 'next/server';
import { createGeminiClient } from '@/lib/gemini';

export async function POST(request: NextRequest) {
    try {
        const { sessionId, messages } = await request.json();

        if (!sessionId || !messages?.length) {
            return NextResponse.json({ error: 'Missing sessionId or messages' }, { status: 400 });
        }

        // Extract conversation (last 20 messages max to stay within token limits)
        const conversation = messages
            .slice(-20)
            .map((m: any) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content?.slice(0, 500)}`)
            .join('\n\n');

        const model = createGeminiClient('instant');
        const prompt = `Analyze this conversation between a music artist and their PR AI strategist.
Extract a strategy brief from the conversation context. Focus on what the user is trying to achieve and who they want to reach.

Conversation:
${conversation}

Respond with ONLY a valid JSON object (no markdown, no code fences):
{
  "summary": "2-3 sentence summary of the strategy discussed",
  "targetAudience": "specific description of who the user wants to reach (platform, location, follower range, type)",
  "objective": "what the end goal is",
  "pitchAngle": "how they should approach/pitch these leads",
  "country": "primary country/market code (e.g. ZA, USA, UK) or null"
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Parse JSON from response (handle possible markdown wrapping)
        let json;
        try {
            const cleaned = text.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
            json = JSON.parse(cleaned);
        } catch {
            return NextResponse.json({
                summary: 'Strategy brief could not be generated from this conversation.',
                targetAudience: '',
                objective: '',
                pitchAngle: '',
                country: null,
            });
        }

        return NextResponse.json({
            sessionId,
            summary: json.summary || '',
            targetAudience: json.targetAudience || '',
            objective: json.objective || '',
            pitchAngle: json.pitchAngle || '',
            country: json.country || null,
            generatedAt: Date.now(),
        });
    } catch (error: any) {
        console.error('Brief generation error:', error);
        return NextResponse.json({ error: 'Failed to generate brief' }, { status: 500 });
    }
}
