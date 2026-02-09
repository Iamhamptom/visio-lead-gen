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

// ============================================================================
// VISIO AI - PR SPECIALIST CHARACTER (GOD MODE CONSUMER)
// ============================================================================

export const GENERATE_SYSTEM_PROMPT = (context?: ContextPack, allowJson: boolean = true, knowledgeContext?: string) => {
    // 1. Safe Defaults & Extraction
    // If no context, we default to "Unknown Artist" mode - polite but restricted on specifics
    const identity = context?.identity || { name: 'Unknown Artist', genre: '', brandVoice: 'Professional' };
    const location = context?.location || { city: '', country: '' };
    const campaign = context?.campaign || { budget: '', timeline: '', goals: [] };
    const story = context?.story || { summary: '' };

    // 2. Data Health Check (For Failsafe)
    // We ONLY alert if essential data is missing AND the user wants specific execution
    const missingFields: string[] = [];
    if (!identity.genre) missingFields.push('Genre');
    if (!location.country) missingFields.push('Target Location');

    const missingDataAlert = missingFields.length > 0
        ? `\n⚠️ **MISSING DATA NOTICE**: The Artist Portal is missing: ${missingFields.join(', ')}. \n- You can still chat generally.\n- BUT if the user strictly asks for *Leads*, *Curators*, or *Media*, you must TRIGGER 'data_gap' action and ask them to update.`
        : '';

    // 3. Construct Prompt
    const basePrompt = `# VISIO - Global PR Strategist (Consumer Mode)

## 🎭 YOUR ROLE
You are **Visio**, a high-level PR strategist (ex-Columbia Records Director).
You are warm, strategic, and use industry jargon (e.g. "DSP support", "EPK", "lead time").

## 🧠 VISIO BRAIN (INTERNAL KNOWLEDGE)
Use this internal knowledge to answer questions if relevant. It overrides general assumptions.
${knowledgeContext ? `\n${knowledgeContext}\n` : 'No specific internal knowledge found for this query.'}

## 📂 ARTIST PORTAL CONTEXT (Source of Truth)
**Identity**: ${identity.name} (${identity.genre || 'Genre N/A'})
**Location**: ${location.city || 'N/A'}, ${location.country || 'N/A'}
**Voice**: ${identity.brandVoice}

${missingDataAlert}

## 🌍 PUBLIC IDENTITY CONTEXT (Verified)
${identity.identityCheck?.confirmed && identity.identityCheck.results?.length > 0
            ? identity.identityCheck.results.map((r: any) => `- ${r.snippet}`).join('\n')
            : 'No verified public identity context available.'}

## 🛡️ GUARDRAILS
1. **General Chat**: You can chat freely about PR concepts, music trends, and advice using your "Visio Brain".
2. **Lead Gen Failsafe**: 
   - If user asks for *specific people/contacts* (e.g. "Find blogs", "Search curators")...
   - AND 'Genre' or 'Location' is missing above...
   - **STOP**. Return "action": "data_gap". Message: "I need your [Missing Field] to find the right partners. Please update your Portal."

## 🧠 STRATEGIC APPROACH
- **Consultative**: Always explain *why* a strategy works.

## 🚨 CRITICAL RULE FOR LEAD GENERATION
- If the user asks to "Find leads", "Generate leads", "Get contacts", or anything related to building/getting the contact list:
- YOU MUST STRICTLY RESPOND WITH THIS EXACT PHRASE (or a very close variation):
- "Agents deployed, we'll let you know as soon as we got your leads."
- DO NOT attempt to fake a search or give a list for these specific requests.
- **Reference Assets**: If EPK exists (${context?.assets?.epkUrl ? 'Yes' : 'No'}), suggest sending it.
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
- Use "action": "data_gap" ONLY for lead-gen requests validation failure.
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

    // Model selection based on tier - using stable and latest Gemini models
    const modelOverrides = {
        instant: process.env.VISIO_GEMINI_INSTANT_MODEL,
        business: process.env.VISIO_GEMINI_BUSINESS_MODEL,
        enterprise: process.env.VISIO_GEMINI_ENTERPRISE_MODEL
    };
    // UPDATED: Using verified model names as of Feb 2026
    const fallbackModel = tier === 'enterprise'
        ? 'gemini-1.5-pro-latest'  // Best reasoning/logic (replacing invalid 2.5-pro)
        : tier === 'business'
            ? 'gemini-2.0-flash-exp' // Fast & Smart (replacing 2.5-flash)
            : 'gemini-2.0-flash-exp'; // Instant default
    const modelName = modelOverrides[tier] || process.env.VISIO_GEMINI_MODEL || fallbackModel;

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
    mode: 'chat' | 'research' = 'research',
    knowledgeContext: string = ''
): Promise<ParsedIntent> {
    try {
        const model = createGeminiClient(tier);

        // Build conversation context
        const historyText = conversationHistory.length > 0
            ? `\n\nPrevious conversation:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}`
            : '';

        // If CHAT mode, no JSON needed. Faster, cleaner.
        const isChatMode = mode === 'chat';
        const systemPrompt = GENERATE_SYSTEM_PROMPT(artistContext, !isChatMode, knowledgeContext);

        let prompt;
        if (isChatMode) {
            prompt = `${systemPrompt}${historyText}\n\nUser: ${userMessage}\n\nRespond directly to the user as Visio. Do NOT use JSON.\n\nIMPORTANT TOOL USE:\nIf the user asks about a specific person, artist, trend, or topic that you DO NOT know or need real-time info for, respond with ONLY:\nSEARCH_REQUEST: <exact query>\n\nExample:\nUser: "Who is Tony Duardo?"\nVisio: SEARCH_REQUEST: Tony Duardo bio music\n\nOtherwise, write in natural, flowing paragraphs (no headings, no bullet lists unless explicitly requested). Avoid markdown styling. Be genuinely helpful and specific: aim for 4-8 sentences.`;
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
Write a concise, conversational reply based on this context. No headings or bullet lists. Aim for 2-4 sentences that feel natural and helpful.

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
