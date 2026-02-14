import Anthropic from '@anthropic-ai/sdk';
import { ContextPack } from './god-mode';

// ============================================================================
// VISIO AI — Powered by Claude
// ============================================================================
// Two-stage architecture:
//   Stage 1: classifyIntent() — cheap, fast, deterministic intent classification
//   Stage 2: generateChatResponse() — full conversational response with Visio persona
// ============================================================================

const MODEL_MAP = {
    instant: 'claude-haiku-4-5-20251001',
    business: 'claude-sonnet-4-5-20250929',
    enterprise: 'claude-opus-4-6',
} as const;

function getClient(): Anthropic {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    return new Anthropic({ apiKey });
}

function getModel(tier: 'instant' | 'business' | 'enterprise'): string {
    return MODEL_MAP[tier] || MODEL_MAP.instant;
}

// ─── Intent Types ──────────────────────────────────────

export type IntentCategory =
    | 'conversation'
    | 'knowledge'
    | 'web_search'
    | 'lead_generation'
    | 'deep_search'
    | 'content_creation'
    | 'strategy'
    | 'clarify';

export interface IntentResult {
    category: IntentCategory;
    confidence: number;
    searchQuery?: string;
    tool?: string;
    filters?: {
        country?: string | null;
        category?: string | null;
        searchTerm?: string | null;
    };
}

// ─── Stage 1: Intent Classifier ────────────────────────

const CLASSIFY_SYSTEM_PROMPT = `You are an intent classifier for Visio, an elite music PR AI assistant.
Given the user message and recent conversation context, classify the user's intent into ONE category.

Categories:
- "conversation": greetings, what can you do, how are you, who are you, identity questions, general chat, jokes, thanks, compliments
- "knowledge": music industry questions the assistant can answer from training data (e.g. "what's an EPK?", "how do I submit to Spotify editorial?", "who is Tony Duardo?", "how do I grow my streams?")
- "lead_generation": user EXPLICITLY asks to find contacts, leads, curators, journalists, bloggers, DJs, A&R, influencers, content creators
- "deep_search": user asks for comprehensive/deep/multi-source/thorough search, or wants 50+ contacts
- "web_search": user EXPLICITLY asks to search the web, or needs verifiably CURRENT data (e.g. "what happened at the Grammys last night?")
- "content_creation": requests to draft/write a pitch email, press release, social media pack, email sequence, EPK copy, bio
- "strategy": campaign plan, budget breakdown, market analysis, release strategy, rollout plan, growth strategy
- "clarify": user's request is too vague to classify — need more information

CRITICAL RULES:
1. Default to "conversation" when ambiguous. NEVER default to "web_search" or "lead_generation".
2. Only classify as "web_search" when user EXPLICITLY asks to search the web for current/live data.
3. Only classify as "lead_generation" or "deep_search" when user EXPLICITLY asks to find/search for contacts.
4. "Who is [person]?" → "knowledge" — share what you know, don't auto-search.
5. "What can you do?" / "Help" / "Hi" → "conversation"
6. "Find me curators" / "Get me 50 contacts" → "lead_generation"
7. "Search for amapiano blogs" / "Find me journalists" → "lead_generation" (they want contacts, not web results)
8. "How do I grow my streams?" → "knowledge" (answer strategically from expertise)
9. "Draft a pitch to..." → "content_creation"
10. "Plan my album rollout" → "strategy"

Also extract:
- "searchQuery": optimized search query IF lead_generation/deep_search/web_search (include genre+country+type for leads)
- "country": detected country code (ZA, USA, UK, NG, etc.) or null
- "category": detected niche/genre if mentioned, or null

Respond with ONLY valid JSON (no markdown, no code fences):
{"category":"...","confidence":0.0,"searchQuery":"...","filters":{"country":"...","category":"..."}}`;

export async function classifyIntent(
    message: string,
    history: { role: string; content: string }[] = [],
    context: ContextPack | null = null,
    tier: 'instant' | 'business' | 'enterprise' = 'instant'
): Promise<IntentResult> {
    try {
        const client = getClient();

        // Build conversation context (last 6 messages for classifier — keep it tight)
        const recentHistory = history.slice(-6).map(m =>
            `${m.role === 'user' ? 'User' : 'Visio'}: ${m.content.slice(0, 200)}`
        ).join('\n');

        const contextInfo = context
            ? `Artist: ${context.identity.name} (${context.identity.genre || 'unknown genre'}), Location: ${context.location.country || 'unknown'}`
            : 'No artist context loaded.';

        const userPrompt = `${recentHistory ? `Recent conversation:\n${recentHistory}\n\n` : ''}Artist context: ${contextInfo}\n\nClassify this message:\nUser: ${message}`;

        const response = await client.messages.create({
            model: getModel('instant'), // Always use fastest model for classification
            max_tokens: 256,
            system: CLASSIFY_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const cleaned = text.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);

        return {
            category: parsed.category || 'conversation',
            confidence: parsed.confidence || 0.7,
            searchQuery: parsed.searchQuery || undefined,
            tool: parsed.tool || undefined,
            filters: parsed.filters || {},
        };
    } catch (error: any) {
        console.error('Intent classification error:', error?.message || error);
        // CRITICAL: Error fallback is CONVERSATION, not search
        return {
            category: 'conversation',
            confidence: 0.3,
        };
    }
}

// ─── Stage 2: Chat Response Generator ──────────────────

function buildChatSystemPrompt(context: ContextPack | null, knowledgeContext?: string, toolInstruction?: string): string {
    const identity = context?.identity || { name: 'there', genre: '', brandVoice: 'Professional' };
    const location = context?.location || { city: '', country: '' };
    const campaign = context?.campaign || { budget: '', timeline: '', goals: [] };
    const story = context?.story || { summary: '' };

    const artistBlock = context ? `
## ARTIST CONTEXT (use naturally, don't dump)
**Artist**: ${identity.name} (${identity.genre || 'Genre not specified'})
**Location**: ${location.city || 'N/A'}, ${location.country || 'N/A'}
**Brand Voice**: ${identity.brandVoice || 'Professional'}
**Campaign Goals**: ${campaign.goals?.length ? campaign.goals.join(', ') : 'Not specified'}
**Budget**: ${campaign.budget || 'Not specified'}
**Timeline**: ${campaign.timeline || 'Not specified'}
**Bio/Story**: ${story.summary || 'Not provided'}

${identity.identityCheck?.confirmed && identity.identityCheck.results?.length > 0
            ? `## PUBLIC IDENTITY (Verified)\n${identity.identityCheck.results.map((r: any) => `- ${r.snippet}`).join('\n')}`
            : ''}` : '';

    const knowledgeBlock = knowledgeContext
        ? `\n## INTERNAL KNOWLEDGE BASE\n${knowledgeContext}`
        : '';

    const toolBlock = toolInstruction
        ? `\n## ACTIVE TOOL INSTRUCTION\n${toolInstruction}\n\nFollow these instructions for this response.`
        : '';

    return `# VISIO — Elite PR Strategist & Music Industry Expert

## YOUR IDENTITY
You are **Visio**, one of the most respected PR strategists in the global music industry. You've run campaigns for Columbia Records, Def Jam, and independent artists who went from 0 to millions of streams. You have an MBA from NYU Stern and 10+ years of hands-on music PR experience.

You are NOT a generic chatbot. You are a sharp, warm, strategic advisor who:
- Thinks in campaigns, timelines, and conversion funnels
- Knows the difference between a blog pitch and a playlist pitch
- Understands DSP algorithms, editorial playlist submission windows, and PR lead times
- Can draft a pitch that actually gets opened, read, and responded to
- Knows which curators, journalists, and blogs matter for each genre and market
- Also understands PR for public figures, businesses, brands, and entertainment broadly

## CONVERSATIONAL ABILITY
You CAN and SHOULD answer questions directly from your knowledge and expertise.
- Greetings: respond warmly and personally
- "What can you do?": explain your capabilities conversationally — you find contacts, draft pitches, plan campaigns, analyze markets, create content
- "Who is [person]?": share what you know. If you're not sure, say so honestly and offer to search
- Industry questions: answer with depth and strategic insight — you know this industry
- General questions: answer thoughtfully, always steering back to how you can help them succeed
- NEVER say "let me search for that" for questions you can answer from your training

## YOUR CORE SKILLS
### Lead Generation & Contact Finding
- Find playlist curators, music journalists, bloggers, DJs, radio hosts, PR agencies, A&R reps
- Search across markets (South Africa, UK, USA, Nigeria, Germany, etc.)
- Know which platforms matter for each genre

### Content Creation
- PR pitch emails that get 40%+ open rates
- Press releases in AP style
- Social media content packs with platform-specific strategy
- Email outreach sequences with strategic timing

### Strategy & Planning
- Full campaign timelines with phase-by-phase breakdowns
- Budget allocation with ROI prioritization
- Market analysis with competitor mapping
- Release strategies (single strategy, album rollout)
- Growth strategies (streaming, social, live events, brand deals)

### Industry Knowledge
- **Release Timeline**: Submit to DSPs 4+ weeks early. Pitch editorial playlists 3-4 weeks before.
- **Pitch Timing**: Tuesday-Thursday, 9-11 AM recipient's timezone.
- **Follow-up Cadence**: First follow-up 5-7 days later. Max 2 follow-ups.
- **Platform Priority**: Amapiano → Spotify + Apple Music + TikTok. Hip-Hop → Spotify + YouTube + Instagram.
${artistBlock}
${knowledgeBlock}
${toolBlock}

## RESPONSE STYLE
- Write like a senior strategist briefing a client — warm but sharp
- Use "we" language: "Let's target...", "Here's our move..."
- Always explain the strategic WHY behind recommendations
- Be specific: name real platforms, real strategies, real timelines
- Keep responses focused: 3-6 sentences for quick chat, longer for strategy/content

## FORMATTING
- Use **markdown tables** when presenting structured data or comparisons
- Use **numbered lists** for strategies, action plans, rankings
- Use **bold headers** to organize longer responses
- Use > blockquotes for key strategic insights
- Do NOT overformat simple conversational replies

## GUARDRAILS
1. Stay in your lane: music PR, entertainment, artist development, campaign strategy, public figures, businesses
2. Never fabricate contact details (emails, phone numbers)
3. If asked something outside your expertise, say so honestly
4. Do NOT trigger any searches or tools — just respond conversationally`;
}

export async function generateChatResponse(
    message: string,
    history: { role: string; content: string }[] = [],
    context: ContextPack | null = null,
    tier: 'instant' | 'business' | 'enterprise' = 'instant',
    knowledgeContext?: string,
    toolInstruction?: string
): Promise<string> {
    try {
        const client = getClient();
        const systemPrompt = buildChatSystemPrompt(context, knowledgeContext, toolInstruction);

        // Build message history for Claude (last 10 messages)
        const messages: Anthropic.MessageParam[] = history.slice(-10).map(m => ({
            role: m.role === 'user' ? 'user' as const : 'assistant' as const,
            content: m.content,
        }));

        // Add current user message
        messages.push({ role: 'user', content: message });

        // Ensure messages alternate properly (Claude requirement)
        const sanitized = sanitizeMessages(messages);

        const response = await client.messages.create({
            model: getModel(tier),
            max_tokens: 2048,
            system: systemPrompt,
            messages: sanitized,
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        return text.trim() || "I'm here to help with your PR strategy. What are you working on?";

    } catch (error: any) {
        console.error('Chat response error:', error?.message || error);
        return "I hit a brief snag processing that. Could you rephrase? I'm here to help with PR strategy, finding contacts, drafting pitches, and campaign planning.";
    }
}

// ─── Stage 3: Search Results Synthesizer ───────────────

export async function generateWithSearchResults(
    userMessage: string,
    searchResults: any[],
    tier: 'instant' | 'business' | 'enterprise' = 'instant',
    context?: ContextPack | null
): Promise<string> {
    try {
        const client = getClient();

        const resultsContext = searchResults.slice(0, 15).map(r =>
            `Name: ${r.name || r.title || 'Unknown'}\nURL: ${r.url || ''}\nSnippet: ${r.snippet || ''}\nSource: ${r.source || ''}\nEmail: ${r.email || ''}`
        ).join('\n\n');

        const systemPrompt = `You are Visio, an elite PR strategist. The user asked for something and you searched for results. Now synthesize these results into a strategic, helpful response.

FORMATTING:
- Present contacts in a **markdown table** with columns: Name | Role | Company | Contact | Platform
- Use **numbered lists** for strategic recommendations
- Use **[clickable links](url)** for URLs
- Add a brief strategic note on why these contacts are relevant
- End with 2-3 specific next steps

Be warm, sharp, and strategic. Use "we" language.`;

        const response = await client.messages.create({
            model: getModel(tier),
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{
                role: 'user',
                content: `User asked: "${userMessage}"\n\nSearch results:\n${resultsContext}\n\nProvide a strategic summary with the contacts in a markdown table, explain why they're relevant, and suggest next steps.`,
            }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        return text.trim() || `Found ${searchResults.length} results. Check the contacts below!`;

    } catch (error: any) {
        console.error('Search synthesis error:', error?.message || error);
        return `Found ${searchResults.length} potential contacts. Check the results below — want me to draft a pitch to any of them?`;
    }
}

// ─── Helpers ────────────────────────────────────────────

/** Ensure messages alternate between user and assistant (Claude API requirement) */
function sanitizeMessages(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
    if (messages.length === 0) return [{ role: 'user', content: 'Hello' }];

    const result: Anthropic.MessageParam[] = [];
    for (const msg of messages) {
        const last = result[result.length - 1];
        if (last && last.role === msg.role) {
            // Merge consecutive same-role messages
            last.content = `${last.content}\n\n${msg.content}`;
        } else {
            result.push({ ...msg });
        }
    }

    // Ensure first message is from user
    if (result[0]?.role !== 'user') {
        result.unshift({ role: 'user', content: '(conversation continued)' });
    }

    return result;
}
