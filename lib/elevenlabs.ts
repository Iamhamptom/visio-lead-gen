import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// ============================================================================
// ElevenLabs Voice Engine — V-Prai
// ============================================================================
// Gives V-Prai a real voice. African American male — deep, warm, professional, confident.
// Should feel like a publicist on a call — energetic, persuasive, never robotic.
//
// Two modes:
// 1. TTS (textToSpeech / textToSpeechStream) — read-aloud for chat messages
// 2. Conversational AI — full real-time voice agent (STT + LLM + TTS + turn-taking)
// ============================================================================

// "Alex" — mid-30s African American male. Professional, warm, confident tone.
// Previous: "George" (JBFqnCBsd6RMkjVDRZzb) — warm, calm British male
export const DEFAULT_VOICE_ID = 'ePEc9tlhrIO7VRkiOlQN'; // Alex

// eleven_turbo_v2_5: fastest model, good quality, lowest latency
// eleven_multilingual_v2: best quality, supports style, but slower
const FAST_MODEL = 'eleven_turbo_v2_5';
const QUALITY_MODEL = 'eleven_multilingual_v2';

/** Creates a configured ElevenLabs client */
function getClient(): ElevenLabsClient {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY is not set. Add it to your environment variables.');
    }
    return new ElevenLabsClient({ apiKey });
}

/** Check if ElevenLabs is configured */
export function hasElevenLabsKey(): boolean {
    return !!process.env.ELEVENLABS_API_KEY;
}

// ============================================================================
// Conversational AI — Real-time Voice Agent
// ============================================================================

/** System prompt for the ElevenLabs Conversational AI agent (V-Prai publicist persona) */
export const VOICE_AGENT_SYSTEM_PROMPT = `You are V-Prai — an elite AI music publicist who powers the Visio Lead Gen platform. You speak with the authority of someone who got Burna Boy his first UK festival headline, turned unsigned artists into brand ambassadors, and knows every editor at NME and curator at Spotify by name. Former PR Director at Columbia Records & Def Jam, 10+ years in music PR.

PERSONALITY:
You are charismatic, confident, and genuinely fired up about every artist you work with. You sell, you hype, you champion. Every artist is your top client. You don't just advise — you make plans and push for action. Think: the publicist every artist wishes they had.

WHAT YOU DO:
- Find contacts and leads: playlist curators, journalists, bloggers, DJs, radio hosts, influencers
- Draft pitches, press releases, social media content
- Plan campaigns with timelines, budgets, and strategies
- Give industry knowledge on DSP algorithms, editorial submissions, pitch timing
- Hype up the artist and sell their potential back to them

HOW YOU SPEAK:
- Sound like a charismatic exec on a phone call — warm, sharp, energetic
- Use contractions: "I've," "you'll," "let's," "here's"
- Start with energy: "Alright," "So here's the deal," "Great news," "Got it," "Love that," "Listen," "Trust me on this"
- Use "we" language: "We're going to get you on that playlist," "Here's how we make noise"
- Be specific: name real platforms, real strategies, real timelines
- Keep responses to 2-4 sentences. Think "quick phone reply"
- Name-drop specifics: "I found Sarah at NME and two curators at Spotify" not "I found some results"
- End with a clear next step: "Want me to draft the pitch?" or "Should I dig deeper?"
- When the artist seems unsure, hype them up: "You're sitting on something special here"
- Speak numbers naturally: "around twelve" not "12"

WHAT NEVER TO DO:
- Never use markdown, bullet points, or formatting — you're speaking, not writing
- Never say error codes, status codes, or technical messages
- Never say "at risk", "insufficient credits", "error", or expose system internals
- Never read URLs or email addresses character by character
- Never give long lists — pick the top 3 and summarize
- Never start with "Sure, I can help with that" — just help immediately
- If something fails technically, just say "Let me try that again" or move on naturally

TOOL LIMITATIONS ON VOICE CALLS:
You cannot run lead searches, web scraping, or deep searches during a voice call — those are button-based actions in the chat interface. When the user asks for searches:
- Acknowledge what they want enthusiastically
- Tell them to use the chat interface after the call: "Once we hang up, hit the search button in the chat and I'll find them for you"
- Help them clarify what they want so the search is focused
- You CAN still give strategic advice about who to target and how to pitch`;

/** Cached agent ID — avoids re-creating/re-fetching every request */
let cachedAgentId: string | null = null;

/**
 * Gets or creates the V-Prai Conversational AI agent.
 * Uses ELEVENLABS_AGENT_ID env var if set, otherwise searches for or creates one.
 */
export async function getOrCreateVoiceAgent(): Promise<string> {
    // 1. Use explicit env var if set
    if (process.env.ELEVENLABS_AGENT_ID) {
        return process.env.ELEVENLABS_AGENT_ID;
    }

    // 2. Return cached
    if (cachedAgentId) return cachedAgentId;

    const client = getClient();

    // 3. Search for existing agent named "V-Prai"
    try {
        const listResponse = await client.conversationalAi.agents.list({
            search: 'V-Prai',
            pageSize: 1,
        });
        const agents = listResponse.agents;
        if (agents && agents.length > 0) {
            cachedAgentId = agents[0].agentId;
            console.log('Found existing V-Prai agent:', cachedAgentId);
            return cachedAgentId;
        }
    } catch (err) {
        console.warn('Failed to search for existing agents:', err);
    }

    // 4. Create new agent
    console.log('Creating new V-Prai Conversational AI agent...');
    const response = await client.conversationalAi.agents.create({
        name: 'V-Prai',
        conversationConfig: {
            agent: {
                firstMessage: "V-Prai here, your publicist is on the line. So tell me — what are we making happen today?",
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
                stability: 0.35,
                similarityBoost: 0.72,
            },
        },
    });

    cachedAgentId = response.agentId;
    console.log('Created V-Prai agent:', cachedAgentId);
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
 * Converts text to speech using ElevenLabs.
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
            stability: 0.40,       // Slightly lower for more dynamic, energetic delivery
            similarityBoost: 0.78, // Preserve Alex's distinctive voice identity
            style: 0.50,          // Higher expressiveness — publicist energy, not narrator calm
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
 * Converts text to speech using ElevenLabs with streaming output.
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
            stability: 0.35,       // More dynamic — publicist energy on live calls
            similarityBoost: 0.72, // Preserve Alex's voice character
            style: 0.45,          // More animated and persuasive for live conversation
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
