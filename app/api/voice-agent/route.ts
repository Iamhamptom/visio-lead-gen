import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { hasElevenLabsKey, getVoiceAgentSignedUrl, VOICE_AGENT_SYSTEM_PROMPT, DEFAULT_VOICE_ID } from '@/lib/elevenlabs';
import { getUserCredits, deductCredits, getCreditCost } from '@/lib/credits';
import { isAdminUser } from '@/lib/api-auth';

/**
 * GET /api/voice-agent
 * Returns a signed URL for the Conversational AI voice agent.
 * Checks auth and credit balance before issuing the URL.
 */
export async function GET(req: NextRequest) {
    const auth = await requireUser(req);
    if (!auth.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasElevenLabsKey()) {
        return NextResponse.json(
            { error: 'Voice feature is not configured.' },
            { status: 503 }
        );
    }

    // Credit check — need at least 1 credit to start a call
    const costPerMinute = getCreditCost('voice_call_minute');
    if (costPerMinute > 0 && !isAdminUser(auth.user)) {
        const balance = await getUserCredits(auth.user.id);
        if (balance < costPerMinute) {
            return NextResponse.json(
                { error: 'Not enough credits for a voice call. Each minute costs 1 credit.' },
                { status: 402 }
            );
        }
    }

    try {
        const signedUrl = await getVoiceAgentSignedUrl();

        return NextResponse.json({
            signedUrl,
            voiceId: DEFAULT_VOICE_ID,
            systemPrompt: VOICE_AGENT_SYSTEM_PROMPT,
        });
    } catch (error: any) {
        console.error('Voice agent error:', error?.message || error);
        return NextResponse.json(
            { error: 'Failed to start voice agent' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/voice-agent
 * Called when a voice call ends. Deducts credits based on call duration.
 * Body: { durationSeconds: number, conversationId?: string }
 */
export async function POST(req: NextRequest) {
    const auth = await requireUser(req);
    if (!auth.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const durationSeconds = body?.durationSeconds;

        if (typeof durationSeconds !== 'number' || durationSeconds < 0) {
            return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
        }

        // Calculate minutes (round up — any partial minute counts)
        const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
        const costPerMinute = getCreditCost('voice_call_minute');
        const totalCost = minutes * costPerMinute;

        if (totalCost > 0 && !isAdminUser(auth.user)) {
            const success = await deductCredits(
                auth.user.id,
                totalCost,
                `voice_call: ${minutes} min`
            );

            if (!success) {
                return NextResponse.json({
                    message: 'Call ended. Could not deduct credits — balance may be insufficient.',
                    minutes,
                    cost: totalCost,
                    deducted: false,
                });
            }
        }

        return NextResponse.json({
            message: 'Call ended',
            minutes,
            cost: totalCost,
            deducted: true,
        });
    } catch (error: any) {
        console.error('Voice call end error:', error?.message || error);
        return NextResponse.json(
            { error: 'Failed to process call end' },
            { status: 500 }
        );
    }
}
