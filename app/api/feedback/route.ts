import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { submitFeedback } from '@/lib/support';
import { recordPositiveFeedback, recordNegativeFeedback } from '@/lib/learning-engine';

export const dynamic = 'force-dynamic';

/**
 * Feedback API
 * POST — Submit feedback on an AI response
 *
 * This is the entry point for the reinforcement learning loop:
 * 1. User rates a response
 * 2. Feedback is stored
 * 3. Learning engine records the event
 * 4. Pattern memory is updated
 * 5. Future responses improve
 */

export async function POST(request: NextRequest) {
    const auth = await requireUser(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const body = await request.json();
        const { rating, comment, sessionId, messageId, aiResponseSnippet, queryContext, genre, country, intent } = body;

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
        }

        // 1. Store the feedback
        const feedbackId = await submitFeedback({
            userId: auth.user.id,
            sessionId,
            messageId,
            rating,
            comment,
            aiResponseSnippet,
            queryContext,
        });

        // 2. Feed into learning engine (non-blocking)
        const learningContext = {
            userId: auth.user.id,
            sessionId,
            query: queryContext,
            response: aiResponseSnippet,
            genre,
            country,
            intent,
            comment,
        };

        if (rating >= 4) {
            recordPositiveFeedback(learningContext).catch(e =>
                console.error('[Feedback] Learning engine error:', e)
            );
        } else if (rating <= 2) {
            recordNegativeFeedback(learningContext).catch(e =>
                console.error('[Feedback] Learning engine error:', e)
            );
        }

        return NextResponse.json({ feedbackId, message: 'Thanks for your feedback!' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
