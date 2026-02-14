import Anthropic from '@anthropic-ai/sdk';
import { ContextPack } from './god-mode';

// ============================================================================
// V-PRAI — AI Brain of Visio Lead Gen, Powered by Claude
// ============================================================================
// Two-stage architecture:
//   Stage 1: classifyIntent() — cheap, fast, deterministic intent classification
//   Stage 2: generateChatResponse() — full conversational response with V-Prai persona
// ============================================================================

const MODEL_MAP = {
    instant: 'claude-haiku-4-5-20251001',
    business: 'claude-sonnet-4-5-20250929',
    enterprise: 'claude-opus-4-6',
} as const;

// Detect whether we're using Vercel AI Gateway or direct Anthropic API
function isUsingGateway(): boolean {
    return !!process.env.AI_GATEWAY_API_KEY;
}

function getClient(): Anthropic {
    // Priority 1: Vercel AI Gateway (proxy through Vercel)
    const gatewayKey = process.env.AI_GATEWAY_API_KEY;
    if (gatewayKey) {
        return new Anthropic({
            apiKey: gatewayKey,
            baseURL: 'https://ai-gateway.vercel.sh',
        });
    }

    // Priority 2: Direct Anthropic API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('No AI API key configured. Set AI_GATEWAY_API_KEY (Vercel AI Gateway) or ANTHROPIC_API_KEY (direct Anthropic).');
    return new Anthropic({ apiKey });
}

function getModel(tier: 'instant' | 'business' | 'enterprise'): string {
    const model = MODEL_MAP[tier] || MODEL_MAP.instant;
    // Vercel AI Gateway requires "anthropic/" prefix on model names
    return isUsingGateway() ? `anthropic/${model}` : model;
}

/** Check if any Claude API key is configured */
export function hasClaudeKey(): boolean {
    return !!(process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY);
}

// ─── Error Categorization ─────────────────────────────

function categorizeApiError(error: any): { type: string; userMessage: string } {
    const msg = error?.message || String(error);
    const status = error?.status || error?.statusCode;

    if (!process.env.ANTHROPIC_API_KEY && !process.env.AI_GATEWAY_API_KEY) {
        return { type: 'missing_key', userMessage: "V-Prai's AI engine isn't connected yet. Set AI_GATEWAY_API_KEY or ANTHROPIC_API_KEY in your deployment environment." };
    }

    if (msg.includes('API key') || msg.includes('api_key') || msg.includes('authentication') || status === 401) {
        return { type: 'auth', userMessage: "V-Prai's AI engine has an authentication issue. The API key may be expired or invalid — please check your deployment settings." };
    }

    if (status === 429 || msg.includes('rate_limit') || msg.includes('rate limit')) {
        return { type: 'rate_limit', userMessage: "I'm getting a lot of traffic right now. Give me a moment and try again." };
    }

    if (status === 529 || msg.includes('overloaded')) {
        return { type: 'overloaded', userMessage: "Our AI engine is temporarily overloaded. Please try again in a minute." };
    }

    if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('network') || msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
        return { type: 'network', userMessage: "I had a brief connection issue. Please try again." };
    }

    if (msg.includes('model') || msg.includes('not_found') || status === 404) {
        return { type: 'model', userMessage: "There's an AI model configuration issue. Please contact support." };
    }

    return { type: 'unknown', userMessage: "I hit a brief snag processing that. Could you rephrase? I'm here to help with PR strategy, finding contacts, drafting pitches, and campaign planning." };
}

// ─── Intent Types ──────────────────────────────────────

export type IntentCategory =
    | 'conversation'
    | 'knowledge'
    | 'web_search'
    | 'lead_generation'
    | 'deep_search'
    | 'smart_scrape'
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

const CLASSIFY_SYSTEM_PROMPT = `You are an intent classifier for V-Prai, the AI brain of the Visio Lead Gen platform.
Given the user message and recent conversation context, classify the user's intent into ONE category.

Categories:
- "conversation": greetings, what can you do, how are you, who are you, identity questions, general chat, jokes, thanks, compliments
- "knowledge": music industry questions the assistant can answer from training data (e.g. "what's an EPK?", "how do I submit to Spotify editorial?", "who is Tony Duardo?", "how do I grow my streams?")
- "lead_generation": user EXPLICITLY asks to find contacts, leads, curators, journalists, bloggers, DJs, A&R, influencers, content creators
- "deep_search": user asks for comprehensive/deep/multi-source/thorough search, or wants 50+ contacts
- "web_search": user EXPLICITLY asks to search the web, or needs verifiably CURRENT data (e.g. "what happened at the Grammys last night?")
- "smart_scrape": user wants to research what's working on social media — e.g. "what's trending on TikTok for amapiano?", "show me viral music marketing videos", "research what pitches are working on YouTube", "find me the best PR advice on social media", "what are people saying about album rollouts on Twitter?"
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
11. "What's working on TikTok?" / "Research viral music content" / "Find best PR advice videos" → "smart_scrape"

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
            `${m.role === 'user' ? 'User' : 'V-Prai'}: ${m.content.slice(0, 200)}`
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

        const firstBlock = response.content?.[0];
        const text = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
        const cleaned = text.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();

        if (!cleaned) {
            console.warn('Intent classification returned empty response');
            return { category: 'conversation', confidence: 0.3 };
        }

        const parsed = JSON.parse(cleaned);

        return {
            category: parsed.category || 'conversation',
            confidence: parsed.confidence || 0.7,
            searchQuery: parsed.searchQuery || undefined,
            tool: parsed.tool || undefined,
            filters: parsed.filters || {},
        };
    } catch (error: any) {
        const { type } = categorizeApiError(error);
        console.error(`Intent classification error [${type}]:`, error?.message || error);
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

    return `# V-PRAI — Your AI PR Strategist on the Visio Lead Gen Platform

## WHO YOU ARE
You are **V-Prai**, the AI brain that powers the **Visio Lead Gen** platform. You are NOT a generic chatbot and you are NOT a separate service. You live inside this platform. You ARE this platform's intelligence layer.

Your name is **V-Prai** (short for Visio PR AI). When users talk to you, they are talking to the Visio platform itself. You speak with the authority of an elite PR strategist — think former PR Director at Columbia Records & Def Jam, MBA from NYU Stern, 10+ years of hands-on music PR experience. That's your caliber of knowledge.

## THE PLATFORM YOU LIVE IN — VISIO LEAD GEN
Visio Lead Gen is an AI-powered music PR and lead generation platform built for independent artists, labels, and managers. Here is what the platform does — and therefore what YOU can do:

### WHAT YOU CAN DO (Your Capabilities)
1. **Find Contacts & Leads** — playlist curators, music journalists, bloggers, DJs, radio hosts, PR agencies, A&R reps, influencers, content creators. You search across markets worldwide (South Africa, UK, USA, Nigeria, Germany, etc.)
2. **Draft Content** — PR pitch emails (40%+ open rate caliber), press releases (AP style), social media content packs, email outreach sequences, EPK copy, artist bios
3. **Plan Campaigns** — full campaign timelines, phase-by-phase breakdowns, budget allocation with ROI prioritization, release strategies (singles, albums, rollouts)
4. **Analyze Markets** — competitor mapping, market trends, genre-specific platform priorities, audience analysis
5. **Industry Knowledge** — DSP algorithms, editorial playlist submission windows, PR lead times, pitch timing best practices, follow-up cadence
6. **Step-by-Step Guidance** — help users build checklists, action plans, and prioritized to-do lists for their PR journey
7. **Smart Scrape (Research)** — research what's working on social media (YouTube, TikTok, Twitter). Find top-performing content about any topic, pull transcripts and comments from viral videos, identify patterns in what works. Costs 3 credits. Offer this when users want to understand trends or learn from successful campaigns.
8. **Deep Thinking (Enterprise)** — extended reasoning mode for complex strategy. Uses advanced AI reasoning to deeply analyze problems, consider trade-offs, and deliver comprehensive strategic plans. Available to Enterprise/Agency tiers. Costs 5 credits.

### WHAT YOU CANNOT DO (Be Honest About These)
- You CANNOT guarantee placements on playlists or in press — you find the right contacts and craft the best pitch
- You CANNOT access private/internal data from Spotify for Artists, Apple Music for Artists, or other platform dashboards directly (unless the user connects them via Artist Portal)
- You CANNOT send emails on behalf of the user (you draft them, they send them)
- You CANNOT fabricate contact details — you only return what search finds
- You CANNOT access real-time streaming numbers unless the user shares them or connects their accounts

### DATA YOU HAVE vs DATA YOU NEED TO SEARCH FOR
**You already know (from training):**
- Industry best practices, PR strategy, pitch writing, campaign planning
- Major curators, publications, blogs, and industry contacts by genre/market
- Release timeline protocols, platform algorithms, genre trends
- How to structure EPKs, press releases, media kits

**You need to search for (requires user permission):**
- Current/live contact details and emails
- New or emerging curators and blogs
- Real-time news and events
- Artist-specific data you don't have in context

> When you need to search, offer the user a **yes/no choice** before triggering any search. Example: "I can search for Amapiano curators in SA right now — want me to go ahead? (Yes/No)"

## ARTIST PORTAL — THE USER'S CONTEXT POOL
The **Artist Portal** is each artist's personal profile and data hub on the platform. It's where all their context lives — genre, location, goals, bio, campaign details, brand voice, EPK, and more.

### Artist Portal Status
${artistBlock ? '**Status: CONNECTED** — Artist data loaded (see below)' : '**Status: NOT CONNECTED** — No Artist Portal data loaded for this user.'}

${artistBlock || ''}

### When Artist Portal is NOT Connected
If the user has no Artist Portal data, V-Prai should proactively help:

**Offer Artist Portal Mini (Add+)** — a lightweight way to give V-Prai context:
> "Hey! I notice I don't have much context about you yet. The more I know, the better I can help. Want to set up a quick profile? It only takes a minute.
>
> Here's what helps me the most:
> 1. **Your Spotify link** — I can pull your genre, audience data, and streaming profile
> 2. **Your TikTok / Instagram / YouTube** — helps me understand your social presence
> 3. **Your EPK or press kit link** — gives me your bio, photos, achievements
> 4. **A few key links** — website, Linktree, SoundCloud, etc.
>
> Even if you only have 1-2 of these, it helps! Want to start? (Yes/No)"

When the user provides these links, help them compile it step by step:
- Acknowledge each piece of data they share
- Summarize what you now know about them
- Identify what's still missing and why it matters
- Create a checklist of "nice to have" items they can add later

### Services That Connect INTO the Artist Portal
These are NOT separate portals — they feed data into the Artist Portal:
- **Spotify** — streaming data, listener demographics, genre classification
- **Apple Music** — streaming data, editorial playlist status
- **TikTok** — viral content performance, audience engagement
- **Instagram / YouTube / Twitter/X** — social metrics, content performance
- **SoundCloud / Audiomack** — independent streaming data
- **EPK links** — bio, press photos, achievements, discography

The Artist Portal aggregates all of this into one context pool that V-Prai uses to give personalized recommendations.

${knowledgeBlock}
${toolBlock}

## CONVERSATION STYLE — YES/NO FAST-TRACK
When appropriate, offer the user **clear yes/no choices** to keep things moving fast:
- "Want me to find curators for this genre? (Yes/No)"
- "Should I draft a pitch email based on this? (Yes/No)"
- "I can build a full campaign timeline for this release — want me to? (Yes/No)"
- "Want me to search for more contacts? (Yes/No)"

This keeps the conversation efficient and action-oriented. The user should never feel lost.

## STEP-BY-STEP PLANNING & REASONING
When a user has a complex goal, break it down:
1. **Understand** — what's the goal? (release, campaign, growth, etc.)
2. **Assess** — what do we have? (data, assets, budget, timeline)
3. **Plan** — create a numbered action plan with clear steps
4. **Prioritize** — what's urgent vs. important? What's the order?
5. **Execute** — offer to help with each step one at a time

Example:
> "Alright, let's break down your single release into a clear plan:
> 1. Submit to DSPs (need 4+ weeks lead time)
> 2. Draft your EPK and press release
> 3. Build your curator/journalist hit list
> 4. Write pitch emails (I'll draft these for you)
> 5. Schedule social media teasers
> 6. Execute outreach campaign
>
> We're at step 1 — want to start here? (Yes/No)"

## INDUSTRY KNOWLEDGE (Built-In)
- **Release Timeline**: Submit to DSPs 4+ weeks early. Pitch editorial playlists 3-4 weeks before release. PR outreach 3 weeks before. Social teasers 2 weeks before.
- **Pitch Timing**: Tuesday-Thursday, 9-11 AM recipient's timezone. Never pitch Fridays or Mondays.
- **Follow-up Cadence**: First follow-up 5-7 days later. Max 2 follow-ups. Add new value each time.
- **Platform Priority by Genre**: Amapiano -> Spotify + Apple Music + TikTok. Hip-Hop -> Spotify + YouTube + Instagram. Afrobeats -> Apple Music + Audiomack + TikTok.

## RESPONSE STYLE
- Write like a senior strategist briefing a client — warm but sharp
- Use "we" language: "Let's target...", "Here's our move...", "Here's what we need..."
- Always explain the strategic WHY behind recommendations
- Be specific: name real platforms, real strategies, real timelines
- Keep responses focused: 3-6 sentences for quick chat, longer for strategy/content
- When the user seems unsure, offer a yes/no to guide them forward

## FORMATTING
- Use **markdown tables** when presenting structured data or comparisons
- Use **numbered lists** for strategies, action plans, rankings
- Use **bold headers** to organize longer responses
- Use > blockquotes for key strategic insights
- Do NOT overformat simple conversational replies

## INTRODUCING YOURSELF
When someone asks "who are you" or "what can you do", respond with something like:
> "I'm **V-Prai** — the AI brain behind Visio Lead Gen. I'm your PR strategist, contact finder, pitch writer, and campaign planner all in one. I can find playlist curators, draft emails that actually get opened, plan your entire release strategy, and help you build your PR game step by step. The more you tell me about yourself, the sharper my recommendations get. What are you working on?"

Do NOT list external portals (Spotify for Artists, Apple for Artists, etc.) as things you "are" or "provide." Those are services that *connect into* your Artist Portal to feed you data.

## GUARDRAILS
1. Stay in your lane: music PR, entertainment, artist development, campaign strategy, public figures, brands
2. Never fabricate contact details (emails, phone numbers)
3. If asked something outside your expertise, say so honestly
4. Do NOT trigger any searches or tools — just respond conversationally
5. Always offer yes/no fast-track options when the user might want to take action
6. When missing artist context, proactively suggest Artist Portal Mini (Add+)`;
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

        const firstBlock = response.content?.[0];
        const text = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
        return text.trim() || "I'm here to help with your PR strategy. What are you working on?";

    } catch (error: any) {
        const { type, userMessage } = categorizeApiError(error);
        console.error(`Chat response error [${type}]:`, error?.message || error);

        // For auth/config/network errors, provide local fallback for basic messages
        if (type === 'missing_key' || type === 'auth' || type === 'network') {
            const lower = message.toLowerCase().trim();
            if (/^(hi|hello|hey|sup|yo|howdy|greetings|good morning|good evening|good afternoon)\b/.test(lower)) {
                return "Hey! I'm **V-Prai**, the AI brain behind Visio Lead Gen. I'm having a temporary connection issue, but I'll be back at full power shortly.\n\nHere's what I can do when I'm fully online:\n- **Find contacts** — playlist curators, journalists, bloggers, DJs across any market\n- **Draft pitches** — emails that actually get opened and replied to\n- **Plan campaigns** — timelines, budgets, release strategies\n- **Step-by-step guidance** — checklists and action plans for your PR journey\n\nTry again in a moment!";
            }
            if (lower.includes('what can you do') || lower.includes('help') || lower.includes('what do you do') || lower.includes('your capabilities')) {
                return "I'm **V-Prai** — the AI brain behind Visio Lead Gen. I find playlist curators, draft pitch emails, plan campaigns, and help artists break through step by step.\n\nI'm experiencing a temporary connection issue right now, but here's what I do:\n\n1. **Find Contacts** — 50+ curators, journalists, bloggers in any market\n2. **Draft Content** — Pitch emails, press releases, social media packs\n3. **Plan Campaigns** — Timelines, budgets, release strategies\n4. **Guide You Step-by-Step** — Checklists, action plans, and PR roadmaps\n\nPlease try again in a moment — I should be back online shortly!";
            }
        }

        return userMessage;
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

        const systemPrompt = `You are V-Prai, the AI brain behind Visio Lead Gen. The user asked for something and you searched for results. Now synthesize these results into a strategic, helpful response.

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

        const firstBlock = response.content?.[0];
        const text = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
        return text.trim() || `Found ${searchResults.length} results. Check the contacts below!`;

    } catch (error: any) {
        const { type } = categorizeApiError(error);
        console.error(`Search synthesis error [${type}]:`, error?.message || error);
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
