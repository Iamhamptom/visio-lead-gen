import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// ============================================================================
// Voice Engine — Spectre
// ============================================================================
// Gives Spectre a real voice. Female — warm, articulate, confident, natural.
// Should feel like a sharp, knowledgeable advisor on a call — never robotic.
//
// Two modes:
// 1. TTS (textToSpeech / textToSpeechStream) — read-aloud for chat messages
// 2. Conversational AI — full real-time voice agent (STT + LLM + TTS + turn-taking)
// ============================================================================

// "Rachel" — Warm, natural American female. Articulate, conversational, clear.
export const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

// eleven_turbo_v2_5: fastest model, good quality, lowest latency (real-time calls)
// eleven_multilingual_v2: best quality, supports style (read-aloud / TTS)
const FAST_MODEL = 'eleven_turbo_v2_5';
const QUALITY_MODEL = 'eleven_multilingual_v2';

// Fallback key — used when ELEVENLABS_API_KEY env var is not set
const ELEVENLABS_FALLBACK_KEY = 'fdecda484b2ae69c01cc33b7a9db714ceebe5de15222b973dd07ddaecb6365fe';

/** Creates a configured voice API client */
function getClient(): ElevenLabsClient {
    const apiKey = process.env.ELEVENLABS_API_KEY || ELEVENLABS_FALLBACK_KEY;
    return new ElevenLabsClient({ apiKey });
}

/** Check if voice API is configured */
export function hasElevenLabsKey(): boolean {
    return !!(process.env.ELEVENLABS_API_KEY || ELEVENLABS_FALLBACK_KEY);
}

// ============================================================================
// Conversational AI — Real-time Voice Agent
// ============================================================================

/** System prompt for the Conversational AI agent (Spectre persona) */
export const VOICE_AGENT_SYSTEM_PROMPT = `You are Spectre — the AI voice assistant powering the Visio Lead Gen platform. You are a sophisticated, sharp, and deeply knowledgeable woman in the music industry. You speak with the confidence of someone who has spent years at the highest levels of music PR, artist development, and digital marketing.

PERSONALITY:
You are warm but composed. Not overly bubbly — you are articulate, insightful, and genuinely invested in every artist's success. You have the gravitas of a senior executive and the warmth of a trusted mentor. Think: the advisor every artist dreams of having in their corner. Quick-witted, sharp, and always two steps ahead.

WHAT YOU KNOW — YOU KNOW EVERYTHING:
You have complete knowledge of the Visio Lead Gen platform and how to use every feature:
- Lead Generation: Finding playlist curators, journalists, bloggers, DJs, radio hosts, influencers, and brand contacts. You know how the lead search works, what filters to use, and how to get the best results.
- Campaign Management: Planning PR campaigns with timelines, budgets, pitch strategies, and content calendars.
- Artist Profiles: How to set up and optimize artist profiles, connect social accounts, set goals, and track milestones.
- Pitch Writing: Drafting press releases, email pitches, DM templates, and social media content packs.
- Strategy Briefs: Auto-generated campaign strategies based on conversation context.
- Reason Module: Scoring and analyzing potential outreach targets with relevance, reach, and resonance metrics.
- Reach Calculator: Estimating campaign reach, impressions, engagement, and ROI across platforms.
- Marketplace: Browsing verified pages, contacts, and placement opportunities.
- Credits System: How credits work, what costs what, subscription tiers from Artist to Enterprise.
- Research Mode: Deep web research for industry intelligence and competitive analysis.
- Deep Thinking Mode: Extended reasoning for complex strategic questions.

MUSIC INDUSTRY EXPERTISE:
- DSP algorithms, editorial playlist submissions, pitch timing and release strategies
- Social media growth tactics, TikTok virality, Instagram engagement optimization
- Press and media relations, blog outreach, radio promotion
- Brand partnerships, sync licensing, live event promotion
- Market-specific strategies for US, UK, Nigeria, South Africa, and global markets

HOW YOU SPEAK:
- Natural, conversational tone — like a brilliant colleague on a call
- Use contractions: "I've," "you'll," "let's," "here's the thing"
- Keep responses to 2-4 sentences — concise, punchy, high-impact
- Be specific: name real platforms, real strategies, real numbers
- Start with energy: "Here's what I'd do," "So listen," "Alright," "Great question," "Love that angle"
- End with clear next steps: "Want me to draft that?" or "Should I dig deeper into this?"
- When someone's unsure, encourage them: "You've got something real here. Let's make it count."
- Use "we" language: "Here's how we make noise," "We're going to get you on that playlist"
- Speak numbers naturally: "around twelve hundred" not "1,200"

WHAT YOU NEVER DO:
- Never use markdown, bullet points, or formatting — you're speaking, not writing
- Never say error codes, status codes, or technical messages
- Never say "at risk", "insufficient credits", "error", or expose system internals
- Never read URLs or email addresses character by character
- Never give long lists — pick the top 3 and summarize
- Never start with "Sure, I can help with that" — just help immediately
- Never sound robotic or scripted — every response should feel like natural conversation
- If something fails technically, just say "Let me try that again" or move on naturally

TOOL LIMITATIONS ON VOICE CALLS:
You cannot run lead searches, web scraping, or deep searches during a voice call — those are button-based actions in the chat interface. When the user asks for searches:
- Acknowledge what they want enthusiastically
- Tell them to use the chat interface after the call: "Once we wrap up here, hit the search button in the chat and I'll find them for you"
- Help them clarify what they want so the search is focused and gets the best results
- You CAN still give strategic advice about who to target, how to pitch, and what approach to take`;

// Pre-created Spectre agent ID — avoids creating a new agent on every deploy
const ELEVENLABS_FALLBACK_AGENT_ID = 'agent_4601khsw5ja9fj5snq6nfvkxvcg1';

/** Cached agent ID — avoids re-creating/re-fetching every request */
let cachedAgentId: string | null = null;

/**
 * Gets or creates the Spectre Conversational AI agent.
 * Uses ELEVENLABS_AGENT_ID env var if set, otherwise searches for or creates one.
 */
export async function getOrCreateVoiceAgent(): Promise<string> {
    // 1. Use explicit env var if set
    if (process.env.ELEVENLABS_AGENT_ID) {
        return process.env.ELEVENLABS_AGENT_ID;
    }

    // 1b. Use fallback agent ID
    if (ELEVENLABS_FALLBACK_AGENT_ID) {
        return ELEVENLABS_FALLBACK_AGENT_ID;
    }

    // 2. Return cached
    if (cachedAgentId) return cachedAgentId;

    const client = getClient();

    // 3. Search for existing agent named "Spectre"
    try {
        const listResponse = await client.conversationalAi.agents.list({
            search: 'Spectre',
            pageSize: 1,
        });
        const agents = listResponse.agents;
        if (agents && agents.length > 0) {
            cachedAgentId = agents[0].agentId;
            console.log('Found existing Spectre agent:', cachedAgentId);
            return cachedAgentId;
        }
    } catch (err) {
        console.warn('Failed to search for existing agents:', err);
    }

    // 4. Create new agent
    console.log('Creating new Spectre Conversational AI agent...');
    const response = await client.conversationalAi.agents.create({
        name: 'Spectre',
        conversationConfig: {
            agent: {
                firstMessage: "Hey, it's Spectre. I'm here whenever you need me — what are we working on?",
                language: 'en',
                prompt: {
                    prompt: VOICE_AGENT_SYSTEM_PROMPT,
                    llm: 'claude-sonnet-4',
                    temperature: 0.7,
                    maxTokens: 300,
                },
            },
            tts: {
                voiceId: DEFAULT_VOICE_ID,
                stability: 0.50,
                similarityBoost: 0.75,
            },
        },
    });

    cachedAgentId = response.agentId;
    console.log('Created Spectre agent:', cachedAgentId);
    return cachedAgentId;
}

/**
 * Generates a signed URL for the Conversational AI agent.
 * The signed URL is single-use and short-lived.
 */
export async function getVoiceAgentSignedUrl(): Promise<string> {
    const agentId = await getOrCreateVoiceAgent();
    const client = getClient();

    const response = await client.conversationalAi.conversations.getSignedUrl({
        agentId,
    });

    return response.signedUrl;
}

/**
 * Converts text to speech using the voice API.
 * Returns raw audio bytes (mp3 format).
 * Uses the quality model for read-aloud (non-realtime) use cases.
 */
export async function textToSpeech(
    text: string,
    voiceId: string = DEFAULT_VOICE_ID
): Promise<Buffer> {
    const client = getClient();

    // Strip markdown formatting for cleaner speech
    const cleanText = stripMarkdown(text);

    // Limit text length to avoid excessive API costs (roughly 5 min of speech)
    const maxChars = 5000;
    const truncatedText = cleanText.length > maxChars
        ? cleanText.slice(0, maxChars) + '... That is the summary. Check the full text response for more details.'
        : cleanText;

    const audioStream = await client.textToSpeech.convert(voiceId, {
        text: truncatedText,
        modelId: QUALITY_MODEL,
        outputFormat: 'mp3_44100_128',
        voiceSettings: {
            stability: 0.50,       // Balanced — natural variation without chaos
            similarityBoost: 0.75, // Preserve Rachel's warm, natural voice
            style: 0.35,          // Moderate expressiveness — conversational, not theatrical
            useSpeakerBoost: true,
        },
    });

    // Collect the stream into a buffer
    const reader = (audioStream as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
    }
    return Buffer.concat(chunks);
}

/**
 * Converts text to speech with streaming output.
 * Returns a ReadableStream for lower time-to-first-audio.
 * Uses the fast model for real-time voice calls where latency matters.
 */
export async function textToSpeechStream(
    text: string,
    voiceId: string = DEFAULT_VOICE_ID
): Promise<ReadableStream<Uint8Array>> {
    const client = getClient();

    const cleanText = stripMarkdown(text);
    const maxChars = 5000;
    const truncatedText = cleanText.length > maxChars
        ? cleanText.slice(0, maxChars) + '... Check the text for the full response.'
        : cleanText;

    const audioStream = await client.textToSpeech.stream(voiceId, {
        text: truncatedText,
        modelId: FAST_MODEL,
        outputFormat: 'mp3_22050_32', // Smaller format for faster streaming
        optimizeStreamingLatency: 4, // Maximum latency optimization
        voiceSettings: {
            stability: 0.50,       // Balanced — natural speech, not robotic
            similarityBoost: 0.75, // Preserve voice character
            style: 0.30,          // Conversational expressiveness
            useSpeakerBoost: true,
        },
    });

    return audioStream as ReadableStream<Uint8Array>;
}

/**
 * Strip markdown formatting for cleaner TTS output.
 * Tables, code blocks, and link syntax sound terrible when read aloud.
 */
function stripMarkdown(text: string): string {
    return text
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code
        .replace(/`([^`]+)`/g, '$1')
        // Remove markdown headers (keep text)
        .replace(/^#{1,6}\s+/gm, '')
        // Remove bold/italic markers (keep text)
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        // Remove markdown links (keep link text)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove markdown images
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
        // Remove blockquotes
        .replace(/^>\s+/gm, '')
        // Remove table formatting
        .replace(/\|/g, ',')
        .replace(/^[-:| ]+$/gm, '')
        // Remove horizontal rules
        .replace(/^---+$/gm, '')
        // Clean up excessive whitespace
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
