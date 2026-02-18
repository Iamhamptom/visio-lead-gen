import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// ============================================================================
// ElevenLabs Text-to-Speech — V-Prai Voice Engine
// ============================================================================
// Gives V-Prai a real voice. Uses a deep, professional male voice
// that matches V-Prai's persona: authoritative, warm, strategic.
// ============================================================================

// Default to "George" — warm, calm British male voice. Trustworthy narrator tone
// that suits V-Prai's smart, authoritative persona.
// Other options: "Daniel" (onwK4e9ZLuTAKqWW03F9) — more formal/news-like British
// Voice Library: https://elevenlabs.io/voice-library
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // George — calm, warm British male

const VOICE_MODEL = 'eleven_turbo_v2_5'; // Fast, high-quality, low-latency

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
        ? cleanText.slice(0, maxChars) + '... That is a summary. For the full details, please read the text response.'
        : cleanText;

    const audioStream = await client.textToSpeech.convert(voiceId, {
        text: truncatedText,
        modelId: VOICE_MODEL,
        outputFormat: 'mp3_44100_128',
        voiceSettings: {
            stability: 0.65,      // Higher = calmer, more consistent delivery
            similarityBoost: 0.80, // Strong voice identity preservation
            style: 0.15,          // Low = calm and measured, not dramatic
            useSpeakerBoost: true,
        },
    });

    // Collect the stream into a buffer
    // The SDK returns a ReadableStream, so we use getReader()
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
 */
export async function textToSpeechStream(
    text: string,
    voiceId: string = DEFAULT_VOICE_ID
): Promise<ReadableStream<Uint8Array>> {
    const client = getClient();

    const cleanText = stripMarkdown(text);
    const maxChars = 5000;
    const truncatedText = cleanText.length > maxChars
        ? cleanText.slice(0, maxChars) + '... That is a summary. For the full details, please read the text response.'
        : cleanText;

    const audioStream = await client.textToSpeech.stream(voiceId, {
        text: truncatedText,
        modelId: VOICE_MODEL,
        outputFormat: 'mp3_44100_128',
        optimizeStreamingLatency: 3, // Max latency optimization for voice calls
        voiceSettings: {
            stability: 0.65,
            similarityBoost: 0.80,
            style: 0.15,
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
