import { NextRequest } from 'next/server';
import { verifyWebhookAuth, toolResponse, toolError } from '@/lib/voice-tools-auth';
import { upsertSkill } from '@/lib/knowledge-base';

export const maxDuration = 10;

/**
 * Save Insight — Voice Tool Webhook
 *
 * ElevenLabs calls this when the user says something worth remembering.
 * Saves as a knowledge skill for future use across all conversations.
 */
export async function POST(req: NextRequest) {
    const authError = verifyWebhookAuth(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const insight = body.insight || body.content || '';
        const category = body.category || 'general';
        const tags = body.tags || [];

        if (!insight) {
            return toolError("I didn't catch what you want me to remember. Say it again?");
        }

        console.log(`[VoiceTool:Learn] Saving: "${insight.slice(0, 80)}..."`);

        // Generate a slug from the insight
        const slug = 'voice-' + insight
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .trim()
            .split(/\s+/)
            .slice(0, 5)
            .join('-');

        // Generate a title from the first ~60 chars
        const title = insight.length > 60
            ? insight.slice(0, 57) + '...'
            : insight;

        const skillId = await upsertSkill({
            slug,
            title,
            category,
            content: insight,
            source: 'voice_conversation',
            tags: [...tags, 'voice', 'user-insight'],
        });

        if (!skillId) {
            return toolError("I had trouble saving that. Tell me again and I'll make sure I remember it.");
        }

        return toolResponse("Got it, I'll remember that for future conversations.");
    } catch (err) {
        console.error('[VoiceTool:Learn] Error:', err);
        return toolError("I couldn't save that right now, but I heard you. Mention it again later and I'll lock it in.");
    }
}
