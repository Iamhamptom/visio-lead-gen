import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech, textToSpeechStream, hasElevenLabsKey } from '@/lib/elevenlabs';
import { requireUser } from '@/lib/api-auth';

/**
 * POST /api/voice
 * Converts text to speech using the voice API.
 * Returns audio/mpeg binary data.
 *
 * Body: { text: string, streaming?: boolean }
 * When streaming=true, returns a chunked stream for lower time-to-first-audio.
 */
export async function POST(req: NextRequest) {
    // Auth check
    const auth = await requireUser(req);
    if (!auth.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if voice API is configured
    if (!hasElevenLabsKey()) {
        return NextResponse.json(
            { error: 'Voice feature is not configured.' },
            { status: 503 }
        );
    }

    try {
        const body = await req.json();
        const text = body?.text;
        const streaming = body?.streaming === true;

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'Missing "text" field' }, { status: 400 });
        }

        // Reject empty or whitespace-only text
        if (text.trim().length === 0) {
            return NextResponse.json({ error: 'Text cannot be empty' }, { status: 400 });
        }

        // Cap text length server-side (5000 chars ~= 3-4 min of speech)
        const maxLength = 5000;
        const safeText = text.slice(0, maxLength);

        // Streaming mode — lower latency, chunked response
        if (streaming) {
            const audioStream = await textToSpeechStream(safeText);
            return new NextResponse(audioStream, {
                status: 200,
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Transfer-Encoding': 'chunked',
                    'Cache-Control': 'no-cache',
                },
            });
        }

        // Standard mode — full buffer response
        const audioBuffer = await textToSpeech(safeText);

        return new NextResponse(new Uint8Array(audioBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': String(audioBuffer.length),
                'Cache-Control': 'private, max-age=3600', // Cache for 1 hour on client
            },
        });
    } catch (error: any) {
        console.error('Voice API error:', error?.message || error);

        if (error?.message?.includes('API key') || error?.message?.includes('authentication')) {
            return NextResponse.json({ error: 'Voice service authentication failed' }, { status: 401 });
        }

        if (error?.message?.includes('rate') || error?.status === 429) {
            return NextResponse.json({ error: 'Voice service rate limit reached. Try again shortly.' }, { status: 429 });
        }

        return NextResponse.json(
            { error: 'Failed to generate voice audio' },
            { status: 500 }
        );
    }
}
