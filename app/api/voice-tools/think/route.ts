import { NextRequest } from 'next/server';
import { verifyWebhookAuth, formatForSpeech, toolResponse, toolError } from '@/lib/voice-tools-auth';
import { getClient, getModel } from '@/lib/claude';
import { searchKnowledgeBase } from '@/lib/rag';
import { getRelevantSkills, formatSkillsForPrompt } from '@/lib/knowledge-base';

export const maxDuration = 30;

/**
 * Think Deeply — Voice Tool Webhook
 *
 * ElevenLabs calls this when the agent needs to reason about complex questions:
 * strategy, campaign planning, expert analysis.
 * Powered by Claude Opus 4.6 with RAG + knowledge base context.
 */
export async function POST(req: NextRequest) {
    const authError = verifyWebhookAuth(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const question = body.question || body.query || '';
        const artistName = body.artist_name || '';
        const genre = body.artist_genre || '';
        const location = body.artist_location || '';

        if (!question) {
            return toolError("I didn't catch the question. Could you repeat that?");
        }

        console.log(`[VoiceTool:Think] "${question}" for ${artistName || 'unknown artist'}`);

        // Pull context from knowledge systems in parallel
        const [ragChunks, skills] = await Promise.all([
            searchKnowledgeBase(question, 3).catch(() => []),
            getRelevantSkills(genre, location, question, 3).catch(() => []),
        ]);

        // Build context
        const ragContext = ragChunks.length > 0
            ? ragChunks.map(c => c.content).join('\n\n')
            : '';
        const skillsContext = formatSkillsForPrompt(skills);

        const systemPrompt = `You are V-Prai, an elite music publicist AI. Answer the question concisely for a voice conversation — maximum 3 sentences. No markdown, no lists, no formatting. Speak naturally as if on a phone call.

${artistName ? `Artist: ${artistName}` : ''}
${genre ? `Genre: ${genre}` : ''}
${location ? `Location: ${location}` : ''}

${ragContext ? `RELEVANT KNOWLEDGE:\n${ragContext}\n` : ''}
${skillsContext ? `\n${skillsContext}` : ''}`;

        const client = getClient();
        const response = await client.messages.create({
            model: getModel('enterprise'),
            max_tokens: 250,
            system: systemPrompt,
            messages: [{ role: 'user', content: question }],
        });

        const text = response.content
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('');

        return toolResponse(formatForSpeech(text, 3));
    } catch (err) {
        console.error('[VoiceTool:Think] Error:', err);
        return toolError("Let me think about that differently. Could you rephrase the question?");
    }
}
