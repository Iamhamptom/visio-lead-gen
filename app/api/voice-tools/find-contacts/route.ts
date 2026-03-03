import { NextRequest } from 'next/server';
import { verifyWebhookAuth, formatForSpeech, toolResponse, toolError } from '@/lib/voice-tools-auth';
import { performLeadSearch } from '@/lib/search';

export const maxDuration = 15;

/**
 * Find Contacts — Voice Tool Webhook
 *
 * ElevenLabs calls this when users ask for curators, journalists, DJs, etc.
 * Powered by Serper lead search with contact-finding optimization.
 */
export async function POST(req: NextRequest) {
    const authError = verifyWebhookAuth(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const query = body.query || '';
        const country = body.artist_location || body.country || 'ZA';

        if (!query) {
            return toolError("Who are you looking for? Give me a type — curators, journalists, DJs?");
        }

        console.log(`[VoiceTool:FindContacts] "${query}" (${country})`);

        const results = await performLeadSearch(query, country);

        if (!results || results.length === 0) {
            return toolError("I couldn't find contacts for that right now. After our call, hit the search button in the chat and I'll do a deep dive for you.");
        }

        // Take top 3-5 and format for speech
        const topResults = results.slice(0, 5);
        const contactLines = topResults
            .map(r => {
                const company = r.company ? ` from ${r.company}` : '';
                return `${r.name}${company}`;
            })
            .join(', ');

        const count = results.length;
        const moreNote = count > 5
            ? `. I found about ${count} total — after our call, use the chat search for the full list with emails and details`
            : '';

        const spoken = `Here are the top picks: ${contactLines}${moreNote}.`;

        return toolResponse(formatForSpeech(spoken, 4));
    } catch (err) {
        console.error('[VoiceTool:FindContacts] Error:', err);
        return toolError("The contact search hit a snag. Use the chat search after our call and I'll find them for you.");
    }
}
