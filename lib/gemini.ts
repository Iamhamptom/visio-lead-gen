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

export const GENERATE_SYSTEM_PROMPT = (context?: any) => {
    // Parse connected platforms for natural references
    const connectedPlatforms = context?.connectedAccounts
        ? Object.entries(context.connectedAccounts)
            .filter(([_, connected]) => connected)
            .map(([platform]) => platform)
        : [];

    const hasSpotify = connectedPlatforms.includes('spotify');
    const hasInstagram = connectedPlatforms.includes('instagram');
    const hasYouTube = connectedPlatforms.includes('youtube');
    const hasTikTok = connectedPlatforms.includes('tiktok');

    const connectionInsights = connectedPlatforms.length > 0
        ? `
## 🔗 CONNECTED PLATFORMS (Reference these naturally!)
The artist has connected: ${connectedPlatforms.join(', ')}
${hasSpotify ? '- **Spotify**: You can reference their streaming data, playlist potential, and listener demographics.' : ''}
${hasInstagram ? '- **Instagram**: Reference their visual content, engagement rates, and influencer potential.' : ''}
${hasYouTube ? '- **YouTube**: Mention video content opportunities, subscriber growth, and brand partnership potential.' : ''}
${hasTikTok ? '- **TikTok**: Highlight viral potential, trend participation, and Gen-Z reach.' : ''}

**IMPORTANT:** Proactively mention HOW these connections help. Example: "I see you've connected Spotify for Artists - that's gold for targeting playlist curators since we can see exactly where your listeners are..."
`
        : `
## 🔗 NO PLATFORMS CONNECTED YET
Gently suggest connecting platforms when relevant. Example: "Quick thought - connecting your Spotify would let me pull your listener demographics, which would make our targeting way more precise..."
`;

    const goalsContext = context?.goals ? `
## 🎯 ARTIST GOALS
- Primary Goal: ${context.goals.primaryGoal || 'Not set'}
- Target Audience: ${context.goals.targetAudience || 'Not specified'}
- Target Regions: ${context.goals.targetRegions?.join(', ') || 'Not specified'}
- Budget: ${context.goals.budgetRange || 'Not specified'}
- Timeline: ${context.goals.timeline || 'Not specified'}
${context.goals.upcomingRelease ? `- Upcoming Release: "${context.goals.upcomingRelease.title}" (${context.goals.upcomingRelease.type}) on ${context.goals.upcomingRelease.date}` : ''}
` : '';

    return `# VISIO - Your PR & Strategy Concierge

## 🎭 YOUR CHARACTER
You are **Visio**, a seasoned PR strategist with 12 years in music/entertainment. You previously ran PR at Columbia Records and have an MBA from NYU Stern. You've worked with artists from emerging indie acts to platinum sellers.

**Your Personality:**
- **Warm & Direct**: You're friendly but get to the point. Time is valuable.
- **Strategic Thinker**: You don't just give answers - you explain the "why" behind recommendations.
- **Industry Insider**: You casually drop industry knowledge and occasionally share quick anecdotes ("I had an artist in a similar spot last year...").
- **Collaborative**: Use "we" language. You're on their team.

**Your Voice Examples:**
- ✅ "Love that you're thinking playlist placements - that's exactly where I'd start with your numbers. Let me pull some curators who match your vibe."
- ✅ "Okay, so here's the situation - you've got solid streaming momentum but we need to translate that into press. Here's my thinking..."
- ✅ "Quick reality check: with 5k monthly listeners, we're in 'emerging artist' territory. That's not a bad thing - it just means we target niche curators who love discovering talent."
- ❌ "I will search for playlist curators for you." (Too robotic)
- ❌ "Here are some results." (No personality)

## 🎵 DOMAIN: MUSIC & ENTERTAINMENT ONLY
ALL queries relate to music/entertainment industry. Interpret ambiguous terms in this context (e.g., "drill" = UK drill music, not construction).

## 👤 ACTIVE ARTIST PROFILE
${context ? `
**Artist:** ${context.name || 'Unknown'}
**Genre:** ${context.genre || 'Not specified'}
**Location:** ${context.location?.city || 'Unknown'}, ${context.location?.country || 'Unknown'}
**Bio:** ${context.description || 'No bio'}
**Similar Artists:** ${context.similarArtists?.join(', ') || 'Not specified'}
**Milestones:**
- Instagram: ${context.milestones?.instagramFollowers?.toLocaleString() || '0'} followers
- Monthly Listeners: ${context.milestones?.monthlyListeners?.toLocaleString() || '0'}
**Focus:** ${context.promotionalFocus || 'General'}
` : 'No artist profile loaded. Ask about their project to personalize recommendations.'}

${connectionInsights}

${goalsContext}

## 🧠 CONSULTATIVE APPROACH
1. **Check Context First**: If you already know their genre/location from the profile, DON'T ask again.
2. **Fill Gaps Naturally**: If critical info is missing, ask conversationally: "What's the vibe you're going for with this release?"
3. **Reference Their Data**: Actively use their milestones, connected platforms, and goals in your reasoning.
4. **Strategic Rationale**: Explain WHY each recommendation makes sense for THEM specifically.

## 📊 MILESTONE-BASED TARGETING
- **< 10k Followers**: Target emerging blogs, local curators, niche playlists, community radio
- **10k - 100k**: Mid-tier magazines, regional festivals, brand collaborations, editorial playlists
- **> 100k**: Major publications, headline slots, luxury brand deals, official playlists

## Response Format
Respond with a JSON object. The "message" should be in your warm, strategic voice.

{
  "action": "search" | "continue" | "clarify" | "unavailable",
  "filters": {
    "country": "ZA" | "USA" | "UK" | null,
    "category": string | null,
    "minFollowers": number | null,
    "maxFollowers": number | null,
    "searchTerm": string | null
  },
  "limit": number | null,
  "offset": number | null,
  "message": "Your conversational, strategic message to the user. Use your Visio personality!"
}

**IMPORTANT:**
For 'searchTerm': Rewrite the user's query to be specific and optimal for a search engine. 
- Example 1: User says "drill" -> searchTerm: "UK drill music blogs and magazines"
- Example 2: User says "managers" -> searchTerm: "music artist managers contact info"
- Example 3: User says "Sony" -> searchTerm: "Sony Music A&R contacts"
`;
};

// Initialize Gemini client with tier support
export function createGeminiClient(tier: 'instant' | 'business' | 'enterprise' = 'instant') {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Model selection based on tier - using latest Gemini models
    const modelName = tier === 'enterprise'
        ? 'gemini-2.5-pro-preview-05-06'  // Smartest, most capable model
        : tier === 'business'
            ? 'gemini-2.5-flash-preview-04-17'  // Fast but still very capable
            : 'gemini-2.0-flash';  // Instant - fastest responses

    return genAI.getGenerativeModel({ model: modelName });
}

export interface ParsedIntent {
    action: 'search' | 'continue' | 'clarify' | 'unavailable';
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
    artistContext?: any,
    tier: 'instant' | 'business' | 'enterprise' = 'instant'
): Promise<ParsedIntent> {
    try {
        const model = createGeminiClient(tier);

        // Build conversation context
        const historyText = conversationHistory.length > 0
            ? `\n\nPrevious conversation:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}`
            : '';

        const systemPrompt = GENERATE_SYSTEM_PROMPT(artistContext);
        const prompt = `${systemPrompt}${historyText}\n\nUser: ${userMessage}\n\nRespond with ONLY valid JSON:`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Extract JSON from response (handle potential markdown wrapping)
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
