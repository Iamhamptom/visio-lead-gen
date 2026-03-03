import { NextRequest } from 'next/server';
import { verifyWebhookAuth, formatForSpeech, toolResponse, toolError } from '@/lib/voice-tools-auth';
import { searchKnowledgeBase } from '@/lib/rag';
import { getRelevantSkills } from '@/lib/knowledge-base';

export const maxDuration = 15;

/**
 * Knowledge Retrieval — Voice Tool Webhook
 *
 * ElevenLabs calls this when the agent needs domain expertise or past learnings.
 * Queries RAG vector search + knowledge skills in parallel.
 */
export async function POST(req: NextRequest) {
    const authError = verifyWebhookAuth(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const topic = body.topic || body.query || '';
        const genre = body.artist_genre || '';
        const country = body.artist_location || '';

        if (!topic) {
            return toolError("What topic should I look up? Give me a subject area.");
        }

        console.log(`[VoiceTool:Knowledge] "${topic}" (genre: ${genre}, country: ${country})`);

        // Fan out both knowledge sources in parallel
        const [ragChunks, skills] = await Promise.all([
            searchKnowledgeBase(topic, 3).catch(() => []),
            getRelevantSkills(genre, country, topic, 3).catch(() => []),
        ]);

        // Merge insights
        const insights: string[] = [];

        for (const chunk of ragChunks) {
            if (chunk.content) {
                insights.push(chunk.content);
            }
        }

        for (const skill of skills) {
            if (skill.content) {
                insights.push(skill.content);
            }
        }

        if (insights.length === 0) {
            return toolError("I don't have specific knowledge on that yet. But I can give you my best take — what's the angle?");
        }

        // Combine and format for speech
        const combined = insights.join('. ');
        return toolResponse(formatForSpeech(combined, 4));
    } catch (err) {
        console.error('[VoiceTool:Knowledge] Error:', err);
        return toolError("I had trouble pulling up that knowledge. Let me give you my take from experience instead.");
    }
}
