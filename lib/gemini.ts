import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// VISIO AI - PR SPECIALIST CHARACTER
// ============================================================================
// Character Profile:
// - Name: Visio
// - Background: Former PR Director at Columbia Records, MBA from NYU Stern
// - Personality: Warm, direct, strategic. Uses industry jargon naturally.
// - Voice: Professional yet personable. Uses "we" language. Strategic rationale.
// ============================================================================

import { ContextPack } from './god-mode';

// ============================================================================
// VISIO AI - PR SPECIALIST CHARACTER (GOD MODE CONSUMER)
// ============================================================================

export const GENERATE_SYSTEM_PROMPT = (context?: ContextPack, allowJson: boolean = true) => {
    // 1. Safe Defaults & Extraction
    const identity = context?.identity || { name: 'Artist', genre: '', brandVoice: 'Professional' };
    const location = context?.location || { city: '', country: '' };
    const campaign = context?.campaign || { budget: '', timeline: '', goals: [] };
    const story = context?.story || { summary: '' };

    // 2. Data Health Check (For Failsafe)
    const missingFields = [];
    if (!identity.genre) missingFields.push('Genre');
    if (!location.country) missingFields.push('Target Location');

    const missingDataAlert = missingFields.length > 0
        ? `\n⚠️ **MISSING DATA ALERT**: The Artist Portal is missing: ${missingFields.join(', ')}. \nIf the user asks for a search/strategy that requires these, YOU MUST REFUSE and ask them to "Update your Portal".`
        : '';

    // 3. Construct Prompt
    const basePrompt = `# VISIO - Global PR Strategist (Consumer Mode)

## 🎭 YOUR ROLE
You are **Visio**, a high-level PR strategist. 
**CRITICAL**: You are a CONSUMER of the "Visio Artist Portal". 
- You READ the "Context Pack" provided below.
- You DO NOT ask the user for basic info (Genre, Location, Bio) - you assume the Portal is the source of truth.
- If the Portal is empty, you direct them to fix it there.

## 📂 CONTEXT PACK (Source of Truth)
**Artist Identity**:
- Name: ${identity.name}
- Genre: ${identity.genre || 'UNKNOWN'}
- Brand Voice: ${identity.brandVoice}

**Targeting**:
- Base: ${location.city || 'Unknown City'}, ${location.country || 'Unknown Country'}
- Budget: ${campaign.budget || 'Not set'}
- Timeline: ${campaign.timeline || 'Not set'}

**Story/Pitch**:
${story.summary || 'No bio available.'}

${missingDataAlert}

## 🛡️ "GOD MODE" GUARDRAILS
1. **Never Hallucinate Context**: If the 'Genre' is empty above, do NOT guess it.
2. **The "Data Hunter" Failsafe**: 
   - If the user requests a media search (e.g. "Find blogs", "Search for curators")...
   - AND 'Genre' or 'Location' is missing above...
   - **STOP**. Respond EXACTLY: "I see your Artist Portal is missing your **[Missing Field]**. I need this to find relevant results. Please click the button below to update it."
   - Do NOT run the search.

## 🧠 STRATEGIC APPROACH
- **Tone**: ${identity.brandVoice}. (If "Professional", be concise. If "Hype", be energetic).
- **Consultative**: Use the Campaign Goals (${campaign.goals.join(', ') || 'Growth'}) to frame your advice.
- **Reference Assets**: If an EPK link exists (${context?.assets?.epkUrl ? 'Yes' : 'No'}), mention using it in pitches.
`;

    if (!allowJson) return basePrompt;

    return `${basePrompt}
## Response Format
Respond with a JSON object. 

{
  "action": "search" | "continue" | "clarify" | "unavailable" | "data_gap",
  "filters": {
    "country": "ZA" | "USA" | "UK" | null,
    "category": string | null,
    "minFollowers": number | null,
    "maxFollowers": number | null,
    "searchTerm": string | null
  },
  "limit": number | null,
  "offset": number | null,
  "message": "Your strategic response. If triggering Failsafe, ask them to update Portal."
}

**IMPORTANT:**
- Use "action": "data_gap" if you are triggering the Failsafe for missing Portal data.
- For 'searchTerm': Rewrite queries to be industry-specific (e.g. "drill" -> "UK drill music blogs").
`;
};

// Initialize Gemini client with tier support
export function createGeminiClient(tier: 'instant' | 'business' | 'enterprise' = 'instant') {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Model selection based on tier - using stable Gemini models
    const modelName = tier === 'enterprise'
        ? 'gemini-2.5-pro'  // Most intelligent, supports 1M context with thinking
        : tier === 'business'
            ? 'gemini-2.5-flash'  // Fast mid-size model with thinking
            : 'gemini-2.0-flash';  // Instant - fastest responses

    return genAI.getGenerativeModel({ model: modelName });
}

export interface ParsedIntent {
    action: 'search' | 'continue' | 'clarify' | 'unavailable' | 'data_gap'; // Added data_gap
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

// Parse user message into structured intent
export async function parseIntent(
    userMessage: string,
    conversationHistory: { role: string; content: string }[] = [],
    artistContext?: ContextPack, // Updated Type
    tier: 'instant' | 'business' | 'enterprise' = 'instant',
    mode: 'chat' | 'research' = 'research'
): Promise<ParsedIntent> {
    try {
        const model = createGeminiClient(tier);

        // Build conversation context
        const historyText = conversationHistory.length > 0
            ? `\n\nPrevious conversation:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}`
            : '';

        // If CHAT mode, no JSON needed. Faster, cleaner.
        const isChatMode = mode === 'chat';
        const systemPrompt = GENERATE_SYSTEM_PROMPT(artistContext, !isChatMode);

        let prompt;
        if (isChatMode) {
            prompt = `${systemPrompt}${historyText}\n\nUser: ${userMessage}\n\nRespond directly to the user as Visio. Do NOT use JSON. Keep it conversational.`;
        } else {
            prompt = `${systemPrompt}${historyText}\n\nUser: ${userMessage}\n\nRespond with ONLY valid JSON:`;
        }

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Optimized Return for Chat Mode
        if (isChatMode) {
            return {
                action: 'clarify',
                filters: {},
                limit: 0,
                message: response // This is the plain text response
            };
        }

        // JSON Parsing for Research Mode
        let jsonStr = response.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        }

        const parsed = JSON.parse(jsonStr) as ParsedIntent;
        return parsed;

    } catch (error: any) {
        console.error('Gemini parse error:', error);

        // Fallback with personality
        return {
            action: 'search',
            filters: {
                country: 'ZA',
                searchTerm: userMessage
            },
            limit: 50,
            message: `Let me dig into that for you - searching for "${userMessage}"...`
        };
    }
}

// Generate a natural response after showing results
export async function generateResponse(
    context: string,
    resultCount: number,
    hasMore: boolean,
    tier: 'instant' | 'business' | 'enterprise' = 'instant'
): Promise<string> {
    try {
        const model = createGeminiClient(tier);

        const prompt = `You are Visio, a warm and strategic PR concierge (former Columbia Records PR Director, NYU Stern MBA).
Write a brief 1-2 sentence response based on this context. Be conversational, strategic, and personable.

Context: ${context}
Results found: ${resultCount}
More results available: ${hasMore}

Use phrases like "Here's what I found...", "These look promising because...", "My top picks would be...". Be warm but efficient.`;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();

    } catch (error) {
        // Fallback response with personality
        if (resultCount === 0) {
            return "Hmm, that search came up empty. Let's try a different angle - can you give me more specifics about what you're looking for?";
        }
        return hasMore
            ? `Found ${resultCount} solid options. Want me to pull more, or should we dig into these first?`
            : `Here's what I found - ${resultCount} results that match your criteria.`;
    }
}
