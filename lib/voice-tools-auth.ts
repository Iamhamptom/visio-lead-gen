import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Voice Tools — Shared Auth & Speech Formatting
// ============================================================================
// Every ElevenLabs Server Tool webhook shares the same authentication,
// response format, and speech-optimization logic. Centralised here.
// ============================================================================

/**
 * Verify that the incoming request is from ElevenLabs.
 * ElevenLabs sends the shared secret in the x-elevenlabs-secret header.
 * Returns null if valid, or a NextResponse error if invalid.
 */
export function verifyWebhookAuth(req: NextRequest): NextResponse | null {
    const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    if (!secret) {
        console.error('[VoiceTools] ELEVENLABS_WEBHOOK_SECRET not configured');
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const provided = req.headers.get('x-elevenlabs-secret');
    if (provided !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return null; // Auth passed
}

/**
 * Format text for spoken delivery.
 * Strips markdown, naturalizes numbers, truncates to a sentence limit.
 */
export function formatForSpeech(text: string, maxSentences: number = 3): string {
    let clean = text
        // Strip markdown formatting
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
        .replace(/^>\s+/gm, '')
        .replace(/^[-*+]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/\|/g, ', ')
        .replace(/^[-:| ]+$/gm, '')
        .replace(/^---+$/gm, '')
        // Naturalize common number patterns
        .replace(/\b(\d{1,3}),(\d{3})\b/g, (_, a, b) => numberToWords(parseInt(a + b)))
        .replace(/\$(\d+)/g, (_, n) => `${numberToWords(parseInt(n))} dollars`)
        .replace(/(\d+)%/g, (_, n) => `${numberToWords(parseInt(n))} percent`)
        // Clean whitespace
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, '. ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    // Truncate to max sentences
    const sentences = clean.split(/(?<=[.!?])\s+/).filter(s => s.length > 5);
    if (sentences.length > maxSentences) {
        clean = sentences.slice(0, maxSentences).join(' ');
    }

    // Ensure it ends with punctuation
    if (clean && !/[.!?]$/.test(clean)) {
        clean += '.';
    }

    return clean;
}

/** Wrap tool output in the expected response format */
export function toolResponse(content: string): NextResponse {
    return NextResponse.json({ response: content });
}

/** Return a graceful spoken error */
export function toolError(spokenFallback?: string): NextResponse {
    return NextResponse.json({
        response: spokenFallback || "I couldn't get that information right now, but I can help you with that through the chat after our call."
    });
}

/** Simple number-to-words for natural speech (handles up to millions) */
function numberToWords(n: number): string {
    if (n === 0) return 'zero';
    if (n < 0) return 'negative ' + numberToWords(-n);

    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
        'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
        'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + numberToWords(n % 100) : '');

    // For larger numbers, use abbreviated form: "about 5 thousand", "around 1.2 million"
    if (n >= 1_000_000) {
        const millions = Math.round(n / 100_000) / 10;
        return `about ${millions} million`;
    }
    if (n >= 1_000) {
        const thousands = Math.round(n / 100) / 10;
        return `about ${thousands} thousand`;
    }

    return String(n);
}
