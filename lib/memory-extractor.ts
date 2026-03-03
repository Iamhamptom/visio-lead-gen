/**
 * Memory Extractor
 *
 * Pre-filters conversation turns for personal-info keywords,
 * then uses Claude Haiku to extract structured memories.
 * Returns {category, content, confidence}[] or empty array.
 */

import { getClient, getModel } from '@/lib/claude';

// Keywords that signal extractable personal info
const PERSONAL_KEYWORDS = [
    'i prefer', 'i like', 'i want', 'i need', 'my goal',
    'i always', 'i never', 'i usually', 'my style',
    'call me', 'my name', 'i am a', "i'm a",
    'my email', 'email me', 'contact me', 'reach me',
    'my genre', 'my music', 'my brand', 'my audience',
    'i focus on', 'my budget', 'my target', 'i plan to',
    'don\'t send', 'don\'t contact', 'no cold', 'only email',
    'i hate', 'i love', 'important to me',
];

interface ExtractedMemory {
    category: 'preference' | 'fact' | 'goal' | 'style' | 'contact_preference';
    content: string;
    confidence: number;
}

/**
 * Extract user memories from a conversation turn.
 * Pre-filters for personal-info keywords before calling Claude.
 */
export async function extractMemoriesFromTurn(params: {
    userMessage: string;
    agentResponse: string;
    existingMemories?: string[];
}): Promise<ExtractedMemory[]> {
    const { userMessage, agentResponse, existingMemories = [] } = params;

    // Pre-filter: check for personal-info keywords
    const lowerUser = userMessage.toLowerCase();
    const hasKeyword = PERSONAL_KEYWORDS.some(kw => lowerUser.includes(kw));
    if (!hasKeyword) return [];

    try {
        const client = getClient();

        const existingContext = existingMemories.length > 0
            ? `\nAlready known (don't duplicate): ${existingMemories.join('; ')}`
            : '';

        const response = await client.messages.create({
            model: getModel('instant'),
            max_tokens: 500,
            system: `Extract personal facts, preferences, or goals from this conversation turn. Return ONLY a JSON array (no markdown, no explanation). Each item: {"category": "preference"|"fact"|"goal"|"style"|"contact_preference", "content": "concise fact", "confidence": 0.5-1.0}. If nothing extractable, return [].${existingContext}`,
            messages: [{
                role: 'user',
                content: `User said: "${userMessage}"\nAssistant replied: "${agentResponse.slice(0, 500)}"`,
            }],
        });

        const text = response.content
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('');

        // Parse JSON from response (handle potential markdown wrapping)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];

        const parsed = JSON.parse(jsonMatch[0]) as ExtractedMemory[];

        // Validate structure
        return parsed.filter(m =>
            m.category && m.content && typeof m.confidence === 'number' &&
            ['preference', 'fact', 'goal', 'style', 'contact_preference'].includes(m.category) &&
            m.confidence >= 0.5 && m.confidence <= 1.0
        );
    } catch (e) {
        console.error('[MemoryExtractor] Extraction failed:', e);
        return [];
    }
}
