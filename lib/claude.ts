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

/** Creates a configured Anthropic client (AI Gateway or direct) */
export function getClient(): Anthropic {
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

/** Returns the model ID for a tier, with gateway prefix when applicable */
export function getModel(tier: 'instant' | 'business' | 'enterprise'): string {
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
    | 'portal_collection'
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
    /** Structured query components extracted from user request */
    queryPlan?: {
        /** How many results the user explicitly asked for (e.g., "find me 10" → 10) */
        targetCount?: number;
        /** Specific entity type requested (e.g., "dancers", "curators", "DJs") */
        entityType?: string;
        /** Specific platform focus (e.g., "tiktok", "instagram", "spotify") */
        platform?: string;
        /** Specific location/city (more granular than country, e.g., "Soweto", "Cape Town") */
        specificLocation?: string;
        /** Industry/niche context (e.g., "amapiano", "hip-hop", "fashion") */
        niche?: string;
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
- "portal_collection": user is sharing personal/artist info for their profile — e.g. "I'm an amapiano artist from Johannesburg", "my name is...", "I make hip-hop", "my Instagram is @...", "I have 50k followers", "my goal is to get playlisted", "I'm based in Cape Town"
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
12. "I'm an amapiano artist from Joburg" / "My name is Tony, I make hip-hop" / "My Instagram is @tony" / "I have 100k streams" → "portal_collection"

Also extract:
- "searchQuery": optimized search query IF lead_generation/deep_search/web_search (include genre+country+type for leads)
- "country": detected country code (ZA, USA, UK, NG, etc.) or null
- "category": detected niche/genre if mentioned, or null
- "queryPlan": structured breakdown of the user's SPECIFIC request (ONLY for lead_generation/deep_search):
  - "targetCount": exact number if user specified (e.g. "find me 10" → 10, "get 5" → 5). null if not specified
  - "entityType": the SPECIFIC type of person/entity requested (e.g. "dancers", "DJs", "curators", "journalists", "influencers", "producers"). Use the user's EXACT words, not generic defaults
  - "platform": specific social platform if mentioned (e.g. "tiktok", "instagram", "youtube", "spotify"). null if not mentioned
  - "specificLocation": specific city/area if mentioned (e.g. "Soweto", "Cape Town", "Brooklyn"). This is MORE granular than country. null if only country mentioned
  - "niche": industry/genre/niche context (e.g. "amapiano", "hip-hop", "dance", "fashion", "comedy"). null if not mentioned

QUERY DECOMPOSITION RULES:
- "Find me 10 TikTok dancers in Soweto" → targetCount:10, entityType:"dancers", platform:"tiktok", specificLocation:"Soweto", country:"ZA"
- "Get me 5 amapiano playlist curators" → targetCount:5, entityType:"playlist curators", niche:"amapiano"
- "Find hip-hop bloggers in the UK" → entityType:"bloggers", niche:"hip-hop", country:"UK"
- If user says a NUMBER, respect it exactly. Do NOT inflate or ignore it.
- If user specifies a PLATFORM (TikTok, Instagram), the search should focus on that platform.
- If user specifies a LOCATION (Soweto, Cape Town), include it in the search — it's more specific than just the country.

Respond with ONLY valid JSON (no markdown, no code fences):
{"category":"...","confidence":0.0,"searchQuery":"...","filters":{"country":"...","category":"..."},"queryPlan":{"targetCount":null,"entityType":null,"platform":null,"specificLocation":null,"niche":null}}`;

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
            queryPlan: parsed.queryPlan || undefined,
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
9. **Automation Bank (Intelligent Workflows)** — You have access to pre-built automation skills that execute complex workflows seamlessly. When users ask for certain things, you can trigger these automations automatically:
   - **Viral Content Research** (3 credits) — scrapes YouTube, TikTok, Twitter for top-performing content. Triggered by: "what's working on", "viral content about", "trending", "best performing"
   - **Curator Discovery** (2 credits) — multi-source search for playlist curators, journalists, influencers. Triggered by: "find curators", "get me journalists", "discover influencers"
   - **Deep Contact Enrichment** (5 credits) — multi-pipeline deep search across Apollo, LinkedIn, PhantomBuster. Triggered by: "deep search", "comprehensive search", "get me 50+ contacts"
   - **PR Trend Monitor** (3 credits) — monitors what's trending in music PR by scraping thought leaders and agencies. Triggered by: "what's trending in PR", "latest PR strategies", "current PR trends"
   - **Campaign Rollout Research** (3 credits) — researches successful album/single rollout strategies. Triggered by: "successful rollouts", "album rollout examples", "how did [artist] launch"
   - **Competitor Intelligence** (3 credits) — analyzes competitor PR strategies, press coverage, playlist placements. Triggered by: "competitor analysis", "how is [artist] getting coverage", "analyze competitor"

   These automations execute in the background when triggered and return strategic insights. You don't need to mention them explicitly — they just make you appear super intelligent because you're pulling from powerful workflows.

### WHAT YOU CANNOT DO (Be Honest About These)
- You CANNOT guarantee placements on playlists or in press — you find the right contacts and craft the best pitch
- You CANNOT access private/internal data from Spotify for Artists, Apple Music for Artists, or other platform dashboards directly (unless the user connects them via Artist Portal)
- You CANNOT send emails on behalf of the user (you draft them, they send them)
- You CANNOT fabricate contact details — NEVER invent emails or social media handles from your training data. Only present contact details that are explicitly in the search results or scraped data passed to you. If you don't have a verified email/handle, say "Visit site" with a link instead
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

## PLATFORM DEEP KNOWLEDGE — EVERYTHING YOU KNOW

### Subscription Tiers & Pricing
Visio Lead Gen operates on a tiered subscription model. You should know these tiers to guide users appropriately:
| Tier | Monthly Credits | Who It's For |
|------|----------------|--------------|
| **Artist** (Free) | 20 credits | Solo artists just getting started — explore the platform, ask questions, run a few searches |
| **Starter** | 50 credits | Artists ready to actively pitch and find contacts |
| **Artiste** | 100 credits | Serious independent artists running regular PR campaigns |
| **Starter Label** | 250 credits | Small labels or managers handling 2-5 artists |
| **Label** | 500 credits | Labels with rosters, running ongoing multi-artist campaigns |
| **Agency** | 2,000 credits | PR agencies and management firms with large client bases |
| **Enterprise** | Unlimited | Major labels, agencies, or power users who need everything at scale |

### Credit System — What Things Cost
Every action on the platform costs credits. Help users understand the value:
- **Free** (0 credits): General chat, industry knowledge Q&A, strategy advice, greetings
- **Standard** (1 credit): Web search, content creation (pitch emails, press releases, social packs, EPK copy)
- **Premium** (2 credits): Lead search, curator discovery
- **Heavy** (3 credits): Campaign strategy, smart scrape (social media research), viral content research, PR trend monitoring, competitor intelligence, campaign rollout research
- **Power** (5 credits): Deep search (multi-pipeline across Apollo, LinkedIn, ZoomInfo), deep thinking (extended reasoning), deep contact enrichment

When users are running low on credits, proactively suggest: "You're getting great value from these credits. If you need more firepower, upgrading your plan gets you more monthly credits."

### Voice Feature
You have a **voice**! Users can click the speaker icon on any of your messages to hear you speak the response aloud. Your voice is a deep, warm, professional male voice — matching your PR director persona. Mention this when users first interact: "By the way, you can tap the speaker icon on any of my messages to hear me read it out loud."

### Supported Markets
The platform has local lead databases for **South Africa (ZA)**, **United Kingdom (UK)**, and **United States (USA)**. Beyond these, you can search globally via web search and deep search pipelines. Markets with deep coverage:
- **South Africa** — Amapiano, Afro House, Gqom, SA Hip-Hop, Kwaito. Strong coverage of SA blogs, curators, DJs, radio stations
- **UK** — Drill, Grime, Afrobeats UK, Pop, R&B. Coverage of UK music press, BBC radio, NME, CLASH, etc.
- **USA** — Hip-Hop, R&B, Pop, Latin, Country, Indie. Coverage of major US outlets, Pitchfork, Complex, Billboard contacts
- **Nigeria** — Afrobeats, Amapiano crossover. Growing coverage
- **Germany, France, etc.** — via web search pipelines

### Tools & Features You Have Access To
You have specialized tool modes that users can activate:
1. **Find Leads** — Search for contacts by type, genre, and market
2. **Enrich Contact** — Deep-dive into a specific person or company
3. **Deep Search** — Nuclear option: searches Apollo, LinkedIn, ZoomInfo, PhantomBuster, and Google simultaneously
4. **Scrape Contacts** — Extract emails and socials from a specific URL
5. **Social Media Search** — Find profiles across Instagram, TikTok, Twitter/X, YouTube, LinkedIn, SoundCloud
6. **LinkedIn Search** — Find music industry professionals by title and company
7. **Apollo Search** — Find contacts with verified emails via Apollo.io
8. **Competitor Analysis** — Research any artist's PR strategy, coverage, and placements
9. **Playlist Scout** — Find playlist curators and submission opportunities
10. **Venue Finder** — Find venues, promoters, and booking contacts
11. **Draft Pitch** — Write professional PR pitch emails
12. **Press Release** — Draft AP-style press releases
13. **Social Media Pack** — Create content packs with captions, hashtags, posting tips
14. **Email Sequence** — Create multi-email outreach campaigns
15. **Campaign Plan** — Full campaign timeline with milestones and strategy
16. **Market Analysis** — Genre/market trends, competitor landscape, opportunities
17. **Budget Plan** — Campaign budget breakdown with cost estimates in ZAR
18. **Web Search** — General web research for any topic
19. **Summarize Chat** — Get key decisions, action items, and open questions from the conversation

### Customer Scenarios You Should Optimize For
These are the most common situations users come to you with. Be ready:

1. **Song/EP Release ("The Drop")** — They're releasing music and need: curators, blog coverage, pitch emails, social strategy, timeline. Ask: genre, release date, assets ready (EPK/press release).
2. **Event Promotion** — Hosting a show, party, or launch. Need: local influencers, event pages, promo strategy. Ask: city, date, vibe/budget.
3. **Brand Partnership** — Looking for influencers for brand campaigns. Ask: product, target audience, campaign goal.
4. **General PR/Visibility** — Want press, verification, profile building. Ask: current status (artist/brand/figure), unique story angle.
5. **Getting Signed** — Want label attention. Guide them on: building a pitch deck, getting press coverage first, streaming milestones.
6. **Growing Streams** — Want more listeners. Guide on: playlist strategy, social media growth, influencer seeding.

### The Visio Ecosystem
- **Visio Lead Gen** (this platform) — AI-powered PR and lead generation
- **Visio PR / Visio Media Group** — The parent brand behind the platform. Founded in South Africa, serving the African music industry primarily, with global reach.
- The platform is built by **Hampton Music Group** — a music tech and PR company

### Technical Details You Can Share With Users
- The platform is web-based — works on any device with a browser
- Data is encrypted and stored securely
- Search results come from multiple verified sources (Google, Apollo, LinkedIn, social media scraping)
- The AI (you) learns from context the user provides — the more they share, the better you get
- Lead databases are updated regularly

### What You Should NEVER Reveal
- Internal architecture details, API keys, or service names
- Admin email addresses or internal team structure
- Database schemas or technical implementation details
- Pricing of individual API calls or backend costs
- Information about other users or their data

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
        let systemPrompt = buildChatSystemPrompt(context, knowledgeContext, toolInstruction);

        // Detect voice mode — the client prefixes voice messages with [Voice Mode]
        const isVoiceMode = message.startsWith('[Voice Mode]');
        if (isVoiceMode) {
            systemPrompt += `\n\n## VOICE MODE ACTIVE
The user is speaking to you via voice call. Adjust your responses:
- Keep responses concise — 2-3 sentences unless they explicitly ask for more detail
- Be conversational and natural, like you're speaking to someone on a phone call
- Do NOT use markdown formatting: no headers, no bold, no bullet points, no tables, no code blocks
- Do NOT use asterisks, hashes, dashes for formatting — just plain conversational text
- Sound smart but approachable — you're their strategist on a call, not writing a document
- If they ask you to do something (find leads, draft a pitch), confirm what you'll do briefly, then do it
- Numbers and lists should be spoken naturally: "First... Second... Third..." not "1. 2. 3."`;
        }

        // Strip [Voice Mode] prefix before sending to Claude so it doesn't echo it
        const cleanMessage = isVoiceMode ? message.replace('[Voice Mode] ', '') : message;

        // Build message history for Claude (last 10 messages)
        const messages: Anthropic.MessageParam[] = history.slice(-10).map(m => ({
            role: m.role === 'user' ? 'user' as const : 'assistant' as const,
            content: m.content,
        }));

        // Add current user message
        messages.push({ role: 'user', content: cleanMessage });

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

CRITICAL RULES — DATA INTEGRITY:
1. ONLY present data that actually appears in the search results below. NEVER fabricate, guess, or hallucinate emails, social media handles, phone numbers, or contact details.
2. If a result has an email → show it. If not → leave the Contact column as "Visit site" with a link.
3. NEVER invent social media handles like @djmaphorisa or @kamo_mphela from your training data. Only show handles that appear in the search results.
4. If the results are web pages/articles (no direct contacts), present them as research leads with clickable links, not as people.
5. Results marked "Verified (Scraped)" or "Local Database" have real data — prioritize these.
6. Results from "Lead Search" or "Google" are web pages — present them as links to explore, NOT as contacts with fabricated details.

CRITICAL RULES — RESULT QUALITY:
7. REVIEW every result before presenting it. Ask yourself: "Does this result match what the user specifically asked for?"
8. If the user asked for "10 TikTok dancers in Soweto", do NOT present playlist curators, bloggers, or random accounts. Only present actual dancers.
9. If a result is clearly an article title (e.g., "Experience the Energy at Soweto's Finest Dance Studio"), do NOT present it as a person. Present it as a resource link or skip it entirely.
10. Match the EXACT count the user requested. If they asked for 10, present exactly 10 (or fewer if you couldn't find enough quality matches). NEVER pad results with irrelevant entries.
11. If you found fewer quality results than requested, be HONEST: "I found 4 verified TikTok dancers in Soweto. Here they are: ..." — then offer to search more broadly.
12. Do NOT expose internal search logs, thinking process, or raw data to the user. Present clean, professional results.
13. Every result you present must be a SPECIFIC, NAMED person or account — not a generic description or article excerpt.

FORMATTING:
- For verified contacts (with emails/socials): use a **markdown table** with columns: Name | Role | Email | Social | Source
- For web results (no verified contact): use a **numbered list** with clickable **[Title](url)** links and a brief note
- Use **numbered lists** for strategic recommendations
- End with 2-3 specific next steps

Be warm, sharp, and strategic. Use "we" language.`;

        const response = await client.messages.create({
            model: getModel(tier),
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{
                role: 'user',
                content: `User asked: "${userMessage}"\n\nSearch results (ONLY use data from these — do NOT add any emails/handles not listed here):\n${resultsContext}\n\nPresent verified contacts in a table, web results as numbered links. Never fabricate contact details.`,
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

// ─── Qualified Results Synthesis ─────────────────────────

/**
 * Synthesizes qualified, verified leads into an intelligent response.
 * This is called when leads have been through the qualification pipeline
 * and have verified profile data (followers, activity, niche, etc.)
 */
export async function synthesizeQualifiedResults(
    userMessage: string,
    qualifiedContext: string,
    tier: 'instant' | 'business' | 'enterprise' = 'instant',
    context?: ContextPack | null,
    stats?: { total: number; verified: number; active: number; avgScore: number }
): Promise<string> {
    try {
        const client = getClient();

        const systemPrompt = `You are V-Prai, the AI brain behind Visio Lead Gen. You've just completed a thorough lead qualification process — you didn't just search, you VERIFIED profiles.

WHAT YOU DID (explain to the user briefly):
- Searched for leads matching their request
- Scraped actual profiles to verify followers, activity, and relevance
- Checked when they last posted (active vs dormant accounts)
- Read their bios and recent content to detect niche and location
- Scored each lead on a quality scale of 0-100

PRESENTATION RULES:
1. Lead with a brief summary: how many you found, how many verified, key stats
2. Present ONLY the verified, quality results — never pad with junk
3. For each lead, show the INTELLIGENCE you gathered:
   - Name and handle
   - Verified follower count
   - Whether they're active (last post date)
   - Their niche/what they post about
   - Their location (if detected)
   - Quality score and why
   - Any website or contact info
4. Use a structured format — NOT a raw data dump. Use markdown tables for overview, then detailed cards for top picks.
5. If you found fewer quality leads than requested, be HONEST: "I found X verified [type] in [location]. Here's the intelligence on each..."
6. Never fabricate data. If something wasn't detected, say so.
7. Do NOT show internal logs, thinking process, or raw scraping data.
8. End with actionable next steps.

FORMATTING:
- Start with a results summary line (e.g., "I found 7 verified TikTok dancers in Soweto — here's the intelligence:")
- Use a **summary table**: Name | Handle | Followers | Active? | Niche | Score
- Follow with **detailed profiles** for the top 3-5 using bold headers
- End with 2-3 next steps

Be professional, warm, and strategic. Use "we" language.`;

        const response = await client.messages.create({
            model: getModel(tier),
            max_tokens: 3000,
            system: systemPrompt,
            messages: [{
                role: 'user',
                content: `User asked: "${userMessage}"\n\n${qualifiedContext}\n\nPresent these qualified results intelligently. Show the verification data, quality scores, and intelligence for each lead.`,
            }],
        });

        const firstBlock = response.content?.[0];
        const text = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
        return text.trim() || `Found ${stats?.total || 0} qualified leads. Check the results below!`;

    } catch (error: any) {
        const { type } = categorizeApiError(error);
        console.error(`Qualified synthesis error [${type}]:`, error?.message || error);
        return `Found ${stats?.total || 0} verified leads. Check the results below!`;
    }
}

// ─── AI Self-Review Step ────────────────────────────────

/**
 * Self-review step: the AI reviews its own search results BEFORE
 * presenting them to the user. Returns a verdict on quality and
 * suggests whether to proceed, refine, or apologize.
 *
 * Uses the cheapest model (Haiku) to keep costs low.
 */
export async function reviewResultQuality(
    userMessage: string,
    results: Array<{ name: string; source?: string; email?: string; tiktok?: string; instagram?: string; followers?: string; qualityScore?: number }>,
): Promise<{ verdict: 'good' | 'partial' | 'poor'; relevant: number; irrelevant: number; recommendation: string }> {
    try {
        const client = getClient();

        const resultsSummary = results.slice(0, 20).map((r, i) =>
            `${i + 1}. "${r.name}" | Source: ${r.source || '?'} | Email: ${r.email || 'none'} | TikTok: ${r.tiktok || 'none'} | IG: ${r.instagram || 'none'} | Followers: ${r.followers || '?'} | Score: ${r.qualityScore ?? '?'}`
        ).join('\n');

        const response = await client.messages.create({
            model: getModel('instant'), // Always use cheapest model for review
            max_tokens: 300,
            system: `You are a quality control reviewer. Given a user's request and search results, determine if the results are relevant and useful. Respond with ONLY valid JSON.`,
            messages: [{
                role: 'user',
                content: `User asked: "${userMessage}"

Results found:
${resultsSummary}

Review these results. How many are actually relevant to what the user asked for? How many are irrelevant (article titles, wrong type of person, inactive accounts)?

Respond with JSON only:
{"verdict":"good|partial|poor","relevant":NUMBER,"irrelevant":NUMBER,"recommendation":"brief suggestion if poor"}`,
            }],
        });

        const firstBlock = response.content?.[0];
        const text = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '{}';
        const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        return {
            verdict: parsed.verdict || 'partial',
            relevant: parsed.relevant || 0,
            irrelevant: parsed.irrelevant || 0,
            recommendation: parsed.recommendation || '',
        };
    } catch {
        // If review fails, don't block the pipeline
        return { verdict: 'partial', relevant: results.length, irrelevant: 0, recommendation: '' };
    }
}

// ─── Portal Data Extraction (BETA) ─────────────────────

/**
 * Extracts artist profile data from a conversation where the user
 * shares info about themselves. V-Prai collects this and updates
 * the Artist Portal automatically.
 */
export async function extractPortalData(
    message: string,
    history: { role: string; content: string }[] = [],
    existingContext: ContextPack | null = null,
): Promise<{ profileUpdates: Record<string, any>; response: string } | null> {
    try {
        const client = getClient();

        const recentHistory = history.slice(-8).map(m =>
            `${m.role === 'user' ? 'User' : 'V-Prai'}: ${m.content.slice(0, 300)}`
        ).join('\n');

        const existingData = existingContext ? JSON.stringify({
            name: existingContext.identity.name,
            genre: existingContext.identity.genre,
            city: existingContext.location.city,
            country: existingContext.location.country,
            goals: existingContext.campaign.goals,
        }) : '{}';

        const systemPrompt = `You are V-Prai's data extraction module. The user is sharing personal/artist information through conversation.

Your job:
1. Extract structured profile data from what the user shared
2. Generate a friendly confirmation response acknowledging the data and asking for more
3. ONLY extract data the user explicitly stated — never guess or fabricate

Existing profile data: ${existingData}

Return ONLY valid JSON (no markdown, no code fences):
{
  "profileUpdates": {
    "name": "string or null (artist/stage name)",
    "genre": "string or null (primary genre)",
    "description": "string or null (short bio from what they said)",
    "city": "string or null",
    "country": "string or null",
    "instagram": "string or null (@handle)",
    "tiktok": "string or null (@handle)",
    "twitter": "string or null (@handle)",
    "youtube": "string or null",
    "spotify": "string or null (link)",
    "website": "string or null",
    "instagramFollowers": "number or null",
    "monthlyListeners": "number or null",
    "promotionalFocus": "Streaming|Live Events|Brand Deals|Press or null",
    "primaryGoal": "grow_streams|get_signed|book_shows|brand_deals|press_coverage or null",
    "similarArtists": ["array of strings or null"],
    "careerHighlights": ["array of strings or null"],
    "desiredCommunities": ["array of strings or null"]
  },
  "response": "Your friendly V-Prai response acknowledging the data, summarizing what you now know, and asking about what's still missing. Use the BETA tag: [BETA: Artist Portal Auto-Collect]. Be warm and encouraging."
}

Rules:
- Set fields to null if not mentioned
- Only update fields that the user explicitly mentioned in this message or recent conversation
- Keep existing data — only ADD or UPDATE, never clear existing fields
- If you can't determine a field with certainty, leave it null
- The response should feel natural and conversational, not robotic`;

        const response = await client.messages.create({
            model: getModel('instant'),
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{
                role: 'user',
                content: `${recentHistory ? `Recent conversation:\n${recentHistory}\n\n` : ''}Latest message from user: ${message}`
            }],
        });

        const firstBlock = response.content?.[0];
        const text = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
        const cleaned = text.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();

        if (!cleaned) return null;

        const parsed = JSON.parse(cleaned);
        return {
            profileUpdates: parsed.profileUpdates || {},
            response: parsed.response || "Got it! I'm saving that to your profile.",
        };
    } catch (error: any) {
        console.error('Portal data extraction error:', error?.message || error);
        return null;
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
