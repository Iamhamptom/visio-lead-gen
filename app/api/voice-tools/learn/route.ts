import { NextRequest } from 'next/server';
import { verifyWebhookAuth, toolResponse, toolError } from '@/lib/voice-tools-auth';
import { upsertSkill } from '@/lib/knowledge-base';
import { storeUserMemory } from '@/lib/memory';

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
        const userId = body.user_id || '';

        if (!insight) {
            return toolError("I didn't catch what you want me to remember. Say it again?");
        }

        console.log(`[VoiceTool:Learn] Saving: "${insight.slice(0, 80)}..." (user: ${userId || 'global'})`);

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

        // Save as global knowledge skill
        const skillId = await upsertSkill({
            slug,
            title,
            category,
            content: insight,
            source: 'voice_conversation',
            tags: [...tags, 'voice', 'user-insight'],
        });

        // Also save as per-user memory (fire-and-forget)
        if (userId) {
            const memCategory = category === 'preference' || category === 'goal' || category === 'style'
                ? category
                : 'fact';
            storeUserMemory({
                userId,
                category: memCategory,
                content: insight,
                source: 'voice_call',
                confidence: 0.8,
            }).catch(e => console.error('[VoiceTool:Learn] User memory save failed:', e));
        }

        if (!skillId) {
            return toolError("I had trouble saving that. Tell me again and I'll make sure I remember it.");
        }

        return toolResponse("Got it, I'll remember that for future conversations.");
    } catch (err) {
        console.error('[VoiceTool:Learn] Error:', err);
        return toolError("I couldn't save that right now, but I heard you. Mention it again later and I'll lock it in.");
    }
}
