import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// ============================================================================
// ElevenLabs Text-to-Speech — V-Prai Voice Engine
// ============================================================================
// Gives V-Prai a real voice. African American male — deep, warm, professional, confident.
// Should feel like a publicist on a call — energetic, persuasive, never robotic.
// ============================================================================

// "Alex" — mid-30s African American male. Professional, warm, confident tone.
// Previous: "George" (JBFqnCBsd6RMkjVDRZzb) — warm, calm British male
const DEFAULT_VOICE_ID = 'ePEc9tlhrIO7VRkiOlQN'; // Alex

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
