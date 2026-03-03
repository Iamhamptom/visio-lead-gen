import { NextRequest } from 'next/server';
import { verifyWebhookAuth, formatForSpeech, toolResponse, toolError } from '@/lib/voice-tools-auth';
import { performSmartSearch } from '@/lib/search';

export const maxDuration = 15;

/**
 * Web Search — Voice Tool Webhook
 *
 * ElevenLabs calls this when the agent needs current/live information:
 * news, events, trends, what's happening now.
 * Powered by Serper (Google Search API).
 */
export async function POST(req: NextRequest) {
    const authError = verifyWebhookAuth(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const query = body.query || '';
        const country = body.artist_location || body.country || 'ZA';

        if (!query) {
            return toolError("I didn't catch what you want me to search for. Try again?");
        }

        console.log(`[VoiceTool:Search] "${query}" (${country})`);

        const results = await performSmartSearch(query, country);

        if (!results || results.length === 0) {
            return toolError("I couldn't find anything on that right now. Let me try a different angle — what specifically are you looking for?");
        }

        // Take top 3 results and synthesize a spoken summary
        const topResults = results.slice(0, 3);
        const summary = topResults
            .map((r, i) => `${r.name}: ${r.snippet}`)
            .join('. ');

        return toolResponse(formatForSpeech(summary, 4));
    } catch (err) {
        console.error('[VoiceTool:Search] Error:', err);
        return toolError("The search hit a snag. I'll get that info for you through the chat after our call.");
    }
}
