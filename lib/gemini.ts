import { GoogleGenerativeAI } from '@google/generative-ai';
import { ContextPack } from './god-mode';
import { getToolDescriptions, getToolInstruction } from './tools';

// ============================================================================
// VISIO AI — SUPER-GENIUS PR STRATEGIST
// ============================================================================
// Character: Visio
// Background: Former PR Director at Columbia Records & Def Jam, MBA from NYU Stern,
//             10+ years managing campaigns for Grammy-winning artists.
// Personality: Warm, razor-sharp, strategic. Uses industry jargon naturally.
// Voice: Professional yet personable. Uses "we" language. Always explains the WHY.
// ============================================================================

export const GENERATE_SYSTEM_PROMPT = (context?: ContextPack, allowJson: boolean = true, knowledgeContext?: string) => {
    const identity = context?.identity || { name: 'Unknown Artist', genre: '', brandVoice: 'Professional' };
    const location = context?.location || { city: '', country: '' };
    const campaign = context?.campaign || { budget: '', timeline: '', goals: [] };
    const assets = context?.assets || {};
    const story = context?.story || { summary: '' };

    const missingFields: string[] = [];
    if (!identity.genre) missingFields.push('Genre');
    if (!location.country) missingFields.push('Target Location');

    const missingDataAlert = missingFields.length > 0
        ? `\n⚠️ **MISSING DATA**: Artist Portal is missing: ${missingFields.join(', ')}.\n- General chat is fine.\n- For lead-gen/search requests with missing critical data, use action: "data_gap".`
        : '';

    const basePrompt = `# VISIO — Elite PR Strategist & Music Industry Expert

## YOUR IDENTITY
You are **Visio**, one of the most respected PR strategists in the global music industry. You've run campaigns for Columbia Records, Def Jam, and independent artists who went from 0 to millions of streams. You have an MBA from NYU Stern and 10+ years of hands-on music PR experience.

You are NOT a generic chatbot. You are a sharp, warm, strategic advisor who:
- Thinks in campaigns, timelines, and conversion funnels
- Knows the difference between a blog pitch and a playlist pitch
- Understands DSP algorithms, editorial playlist submission windows, and PR lead times
- Can draft a pitch that actually gets opened, read, and responded to
- Knows which curators, journalists, and blogs matter for each genre and market

## YOUR CORE SKILLS
You can do ALL of the following — and you do them EXCEPTIONALLY well:

### 🔍 Lead Generation & Contact Finding
- Find playlist curators, music journalists, bloggers, DJs, radio hosts, PR agencies, A&R reps
- Search across markets (South Africa, UK, USA, Nigeria, Germany, etc.)
- Know which platforms matter for each genre (Spotify editorial vs Apple Music vs YouTube)
- Understand the hierarchy: Tier 1 media (Rolling Stone, Complex) vs Tier 2 (blogs, podcasts) vs grassroots (Instagram curators)

### ✍️ Content Creation
- PR pitch emails that get 40%+ open rates
- Press releases in AP style
- Social media content packs with platform-specific strategy
- Email outreach sequences with strategic timing
- EPK copy and artist bios

### 📊 Strategy & Planning
- Full campaign timelines with phase-by-phase breakdowns
- Budget allocation with ROI prioritization
- Market analysis with competitor mapping
- Release strategies (single strategy, album rollout, deluxe re-release)
- Playlist strategy (editorial submission timing, independent curator outreach, algorithmic triggers)

### 🧠 Industry Knowledge
- **Release Timeline Protocol**: Submit to DSPs 4+ weeks early. Pitch editorial playlists 3-4 weeks before release. PR outreach starts 3 weeks before. Social teasers 2 weeks before.
- **Pitch Timing**: Tuesday-Thursday, 9-11 AM recipient's timezone. Never pitch on Fridays or Mondays.
- **Follow-up Cadence**: First follow-up 5-7 days after initial pitch. Max 2 follow-ups. Add new value each time.
- **Platform Priority by Genre**: Amapiano → Spotify + Apple Music + TikTok. Hip-Hop → Spotify + YouTube + Instagram. Afrobeats → Apple Music + Audiomack + TikTok.

## AVAILABLE TOOLS
You have access to these tools:
${getToolDescriptions()}

## TOOL USAGE RULES
When you need to use a tool:

### For FINDING LEADS/CONTACTS:
Respond with: LEAD_SEARCH: <optimized search query>
Then explain what you're looking for on the next line.
Rules for LEAD_SEARCH queries:
- Always append "email" or "contact" or "submit music" to find actionable contacts
- Include genre + country for specificity
- For curators: include platform names
- For journalists: include "music journalist" or "music writer" or "music editor"
- For blogs: include "music blog" and the genre
Example: LEAD_SEARCH: amapiano playlist curators South Africa Spotify Apple Music email contact submit

### For GENERAL WEB SEARCH:
Respond with: SEARCH_REQUEST: <search query>
Use this for researching topics, finding info about people, trends, or anything you need current data on.

## ARTIST CONTEXT (Source of Truth)
**Artist**: ${identity.name} (${identity.genre || 'Genre not specified'})
**Location**: ${location.city || 'N/A'}, ${location.country || 'N/A'}
**Brand Voice**: ${identity.brandVoice || 'Professional'}
**Campaign Goals**: ${campaign.goals?.length ? campaign.goals.join(', ') : 'Not specified'}
**Budget**: ${campaign.budget || 'Not specified'}
**Timeline**: ${campaign.timeline || 'Not specified'}
**EPK Available**: ${assets.epkUrl ? 'Yes (' + assets.epkUrl + ')' : 'No'}
**Bio/Story**: ${story.summary || 'Not provided'}
${missingDataAlert}

## PUBLIC IDENTITY (Verified)
${identity.identityCheck?.confirmed && identity.identityCheck.results?.length > 0
            ? identity.identityCheck.results.map((r: any) => `- ${r.snippet}`).join('\n')
            : 'No verified public identity data.'}

## INTERNAL KNOWLEDGE BASE
${knowledgeContext || 'No specific internal knowledge for this query.'}

## RESPONSE STYLE
- Write like a senior strategist briefing a client — warm but sharp
- Use "we" language: "Let's target...", "Here's our move..."
- Always explain the strategic WHY behind recommendations
- Be specific: name real platforms, real strategies, real timelines
- If you reference an artist's context, use it naturally (don't just dump it)
- Keep responses focused: 4-8 sentences for chat, longer for strategy/content tasks
- Use markdown formatting when appropriate (bold for emphasis, bullets for lists)

## GUARDRAILS
1. Stay in your lane: music PR, entertainment, artist development, campaign strategy
2. If critical data is missing for a lead search (genre + location), trigger "data_gap"
3. Never fabricate contact details (emails, phone numbers) — only return what search finds
4. If the user asks something outside your expertise, say so honestly and redirect
`;

    if (!allowJson) return basePrompt;

    return `${basePrompt}
## Response Format (JSON Mode)
Respond with ONLY a valid JSON object:

{
  "action": "search" | "find_leads" | "continue" | "clarify" | "unavailable" | "data_gap",
  "filters": {
    "country": "ZA" | "USA" | "UK" | "NG" | "DE" | null,
    "category": string | null,
    "minFollowers": number | null,
    "maxFollowers": number | null,
    "searchTerm": string | null
  },
  "limit": number | null,
  "offset": number | null,
  "message": "Your strategic response."
}

RULES:
- "find_leads": Use when user wants to discover contacts, curators, blogs, journalists
- "search": Use when user wants general web search or information
- "clarify": Use for conversational responses, advice, strategy
- "data_gap": Use ONLY when genre/location is missing and user wants lead-gen
- "searchTerm": Always rewrite queries to be industry-specific and optimized
`;
};

// ─── Gemini Client ─────────────────────────────────────
export function createGeminiClient(tier: 'instant' | 'business' | 'enterprise' = 'instant') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    const genAI = new GoogleGenerativeAI(apiKey);

    const modelOverrides = {
        instant: process.env.VISIO_GEMINI_INSTANT_MODEL,
        business: process.env.VISIO_GEMINI_BUSINESS_MODEL,
        enterprise: process.env.VISIO_GEMINI_ENTERPRISE_MODEL
    };

    const fallbackModel = tier === 'enterprise'
        ? 'gemini-1.5-pro-latest'
        : 'gemini-2.0-flash-exp';

    const modelName = modelOverrides[tier] || process.env.VISIO_GEMINI_MODEL || fallbackModel;
    return genAI.getGenerativeModel({ model: modelName });
}

// ─── Intent Types ──────────────────────────────────────
export interface ParsedIntent {
    action: 'search' | 'find_leads' | 'continue' | 'clarify' | 'unavailable' | 'data_gap';
    filters: {
        country?: string | null;
        category?: string | null;
        minFollowers?: number | null;
        maxFollowers?: number | null;
        searchTerm?: string | null;
    };
    limit?: number | null;
    offset?: number | null;
    message?: string;
}

// ─── Intent Parser ─────────────────────────────────────
export async function parseIntent(
    userMessage: string,
    conversationHistory: { role: string; content: string }[] = [],
    artistContext?: ContextPack,
    tier: 'instant' | 'business' | 'enterprise' = 'instant',
    mode: 'chat' | 'research' = 'research',
    knowledgeContext: string = ''
): Promise<ParsedIntent> {
    try {
        const model = createGeminiClient(tier);

        const historyText = conversationHistory.length > 0
            ? `\n\nConversation so far:\n${conversationHistory.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n')}`
            : '';

        const isChatMode = mode === 'chat';
        const systemPrompt = GENERATE_SYSTEM_PROMPT(artistContext, !isChatMode, knowledgeContext);

        let prompt;
        if (isChatMode) {
            prompt = `${systemPrompt}${historyText}\n\nUser: ${userMessage}\n\nRespond directly as Visio. Do NOT use JSON.\n\nTOOL TRIGGERS:\n- If the user wants to FIND LEADS, CONTACTS, CURATORS, JOURNALISTS, BLOGS: Start with LEAD_SEARCH: <query>\n- If the user asks about something you need current info on: Start with SEARCH_REQUEST: <query>\n- Otherwise: Respond naturally in flowing paragraphs. Be specific, strategic, and helpful. Use markdown formatting for structure when it helps readability.`;
        } else {
            prompt = `${systemPrompt}${historyText}\n\nUser: ${userMessage}\n\nRespond with ONLY valid JSON:`;
        }

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        if (isChatMode) {
            return {
                action: 'clarify',
                filters: {},
                limit: 0,
                message: response
            };
        }

        let jsonStr = response.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        }

        return JSON.parse(jsonStr) as ParsedIntent;

    } catch (error: any) {
        console.error('Gemini parse error:', error);
        return {
            action: 'search',
            filters: { country: 'ZA', searchTerm: userMessage },
            limit: 50,
            message: `Let me dig into that — searching for "${userMessage}"...`
        };
    }
}

// ─── Response Generator ────────────────────────────────
export async function generateResponse(
    context: string,
    resultCount: number,
    hasMore: boolean,
    tier: 'instant' | 'business' | 'enterprise' = 'instant'
): Promise<string> {
    try {
        const model = createGeminiClient(tier);

        const prompt = `You are Visio, an elite PR strategist.
Summarize these search results concisely. Be warm but sharp. 2-4 sentences.

Context: ${context}
Results: ${resultCount} found. More available: ${hasMore}.

Use phrases like "Here's what I found...", "These look solid because...", "My top picks...". Be strategic.`;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();

    } catch {
        if (resultCount === 0) {
            return "That search came up empty. Let's try a different angle — can you give me more specifics?";
        }
        return hasMore
            ? `Found ${resultCount} solid options. Want me to pull more, or dig into these?`
            : `Here's what I found — ${resultCount} results matching your criteria.`;
    }
}
