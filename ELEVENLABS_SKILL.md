# ElevenLabs Voice Integration Skill

Use this skill when implementing ElevenLabs text-to-speech (TTS) or Conversational AI voice agents in a Next.js project. This covers the full stack: server-side SDK client, API routes, and React client components for both read-aloud TTS and real-time voice conversations.

---

## Dependencies

```json
{
  "@elevenlabs/elevenlabs-js": "^2.36.0",
  "@elevenlabs/react": "^0.14.0"
}
```

Install with:
```bash
npm install @elevenlabs/elevenlabs-js @elevenlabs/react
```

- `@elevenlabs/elevenlabs-js` — Server-side Node SDK for TTS conversion and Conversational AI agent management
- `@elevenlabs/react` — Client-side React hook (`useConversation`) for real-time voice calls via WebSocket

---

## Environment Variables

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=optional_pre_created_agent_id
```

- `ELEVENLABS_API_KEY` — Required. Get from https://elevenlabs.io/app/settings/api-keys
- `ELEVENLABS_AGENT_ID` — Optional. If you pre-create a Conversational AI agent in the ElevenLabs dashboard, set its ID here to skip auto-creation.

---

## Architecture Overview

The integration has two modes:

### 1. TTS Read-Aloud (Text → Audio)
User clicks a "Listen" button → client POST to `/api/voice` → server calls ElevenLabs TTS API → returns `audio/mpeg` binary → client plays via `<audio>` element.

### 2. Conversational AI (Real-Time Voice Agent)
User clicks "Call" → client GET to `/api/voice-agent` → server returns a signed WebSocket URL → client connects via `@elevenlabs/react` `useConversation` hook → real-time bidirectional voice (STT + LLM + TTS + turn-taking).

---

## File Structure

```
lib/
  elevenlabs.ts          # Server-side SDK client, TTS functions, agent management
app/
  api/
    voice/route.ts       # POST endpoint for TTS read-aloud
    voice-agent/route.ts # GET: signed URL for voice calls, POST: deduct credits on call end
  components/
    VoiceButton.tsx      # "Listen" button — plays TTS audio with browser fallback
    VoiceCallModal.tsx   # Full-screen voice call UI with real-time conversation
```

---

## Server-Side: `lib/elevenlabs.ts`

### Client Setup

```typescript
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

function getClient(): ElevenLabsClient {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');
    return new ElevenLabsClient({ apiKey });
}

export function hasElevenLabsKey(): boolean {
    return !!process.env.ELEVENLABS_API_KEY;
}
```

### Voice & Model Selection

```typescript
// Pick a voice from https://elevenlabs.io/voice-library
// "Eric" — Smooth, Trustworthy. American, middle-aged, classy, conversational.
export const DEFAULT_VOICE_ID = 'cjVigY5qzO86Huf0OWal';

// Models:
// eleven_turbo_v2_5  — fastest, good quality, lowest latency (use for streaming/real-time)
// eleven_multilingual_v2 — best quality, supports style param, slower (use for read-aloud)
const FAST_MODEL = 'eleven_turbo_v2_5';
const QUALITY_MODEL = 'eleven_multilingual_v2';
```

### TTS: Full Buffer (Read-Aloud)

Use `client.textToSpeech.convert()` when latency doesn't matter and you want highest quality. Returns a complete audio buffer.

```typescript
export async function textToSpeech(
    text: string,
    voiceId: string = DEFAULT_VOICE_ID
): Promise<Buffer> {
    const client = getClient();
    const cleanText = stripMarkdown(text);

    // Cap at ~5000 chars to avoid excessive API costs
    const maxChars = 5000;
    const truncatedText = cleanText.length > maxChars
        ? cleanText.slice(0, maxChars) + '... That is the summary.'
        : cleanText;

    const audioStream = await client.textToSpeech.convert(voiceId, {
        text: truncatedText,
        modelId: 'eleven_multilingual_v2',  // Best quality for non-realtime
        outputFormat: 'mp3_44100_128',       // High quality MP3
        voiceSettings: {
            stability: 0.40,        // Lower = more expressive/dynamic
            similarityBoost: 0.78,  // Higher = closer to original voice
            style: 0.50,            // Higher = more animated delivery
            useSpeakerBoost: true,  // Enhances voice clarity
        },
    });

    // Collect stream into buffer
    const reader = (audioStream as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
    }
    return Buffer.concat(chunks);
}
```

### TTS: Streaming (Low Latency)

Use `client.textToSpeech.stream()` when you need fast time-to-first-audio (live voice calls, real-time playback).

```typescript
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
        modelId: 'eleven_turbo_v2_5',    // Fastest model for streaming
        outputFormat: 'mp3_22050_32',     // Smaller format for faster streaming
        optimizeStreamingLatency: 4,       // 1-4, higher = more latency optimization
        voiceSettings: {
            stability: 0.35,
            similarityBoost: 0.72,
            style: 0.45,
            useSpeakerBoost: true,
        },
    });

    return audioStream as ReadableStream<Uint8Array>;
}
```

### Markdown Stripping

Always strip markdown before sending to TTS — tables, code blocks, and link syntax sound terrible when read aloud.

```typescript
function stripMarkdown(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, '')           // Code blocks
        .replace(/`([^`]+)`/g, '$1')               // Inline code
        .replace(/^#{1,6}\s+/gm, '')               // Headers
        .replace(/\*\*([^*]+)\*\*/g, '$1')         // Bold
        .replace(/\*([^*]+)\*/g, '$1')             // Italic
        .replace(/__([^_]+)__/g, '$1')             // Bold (underscores)
        .replace(/_([^_]+)_/g, '$1')               // Italic (underscores)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // Links (keep text)
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')    // Images (remove)
        .replace(/^>\s+/gm, '')                    // Blockquotes
        .replace(/\|/g, ',')                       // Table pipes → commas
        .replace(/^[-:| ]+$/gm, '')                // Table separators
        .replace(/^---+$/gm, '')                   // Horizontal rules
        .replace(/\n{3,}/g, '\n\n')                // Excessive newlines
        .trim();
}
```

---

## Server-Side: Conversational AI Agent

### Creating / Finding an Agent

The Conversational AI feature requires an "agent" — a persistent configuration on ElevenLabs that bundles voice, LLM, system prompt, and turn-taking settings.

```typescript
let cachedAgentId: string | null = null;

export async function getOrCreateVoiceAgent(): Promise<string> {
    // 1. Use explicit env var if set
    if (process.env.ELEVENLABS_AGENT_ID) {
        return process.env.ELEVENLABS_AGENT_ID;
    }

    // 2. Return cached
    if (cachedAgentId) return cachedAgentId;

    const client = getClient();

    // 3. Search for existing agent by name
    try {
        const listResponse = await client.conversationalAi.agents.list({
            search: 'My Agent',
            pageSize: 1,
        });
        const agents = listResponse.agents;
        if (agents && agents.length > 0) {
            cachedAgentId = agents[0].agentId;
            return cachedAgentId;
        }
    } catch (err) {
        console.warn('Failed to search for existing agents:', err);
    }

    // 4. Create new agent
    const response = await client.conversationalAi.agents.create({
        name: 'My Agent',
        conversationConfig: {
            agent: {
                firstMessage: "Hey, how can I help you today?",
                language: 'en',
                prompt: {
                    prompt: 'Your system prompt here...',
                    llm: 'claude-sonnet-4',   // LLM the agent uses for responses
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
    return cachedAgentId;
}
```

### Generating a Signed URL

Signed URLs are single-use, short-lived WebSocket URLs that let the client connect to the agent without exposing your API key.

```typescript
export async function getVoiceAgentSignedUrl(): Promise<string> {
    const agentId = await getOrCreateVoiceAgent();
    const client = getClient();

    const response = await client.conversationalAi.conversations.getSignedUrl({
        agentId,
    });

    return response.signedUrl;
}
```

---

## API Routes

### `POST /api/voice` — TTS Read-Aloud

Accepts `{ text: string, streaming?: boolean }`, returns `audio/mpeg`.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech, textToSpeechStream, hasElevenLabsKey } from '@/lib/elevenlabs';

export async function POST(req: NextRequest) {
    // Add your auth check here

    if (!hasElevenLabsKey()) {
        return NextResponse.json(
            { error: 'Voice feature is not configured.' },
            { status: 503 }
        );
    }

    try {
        const body = await req.json();
        const text = body?.text;
        const streaming = body?.streaming === true;

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json({ error: 'Missing or empty "text" field' }, { status: 400 });
        }

        const safeText = text.slice(0, 5000);

        // Streaming mode — chunked response, lower latency
        if (streaming) {
            const audioStream = await textToSpeechStream(safeText);
            return new NextResponse(audioStream, {
                status: 200,
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Transfer-Encoding': 'chunked',
                    'Cache-Control': 'no-cache',
                },
            });
        }

        // Standard mode — full buffer
        const audioBuffer = await textToSpeech(safeText);
        return new NextResponse(new Uint8Array(audioBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': String(audioBuffer.length),
                'Cache-Control': 'private, max-age=3600',
            },
        });
    } catch (error: any) {
        console.error('Voice API error:', error?.message || error);

        if (error?.message?.includes('rate') || error?.status === 429) {
            return NextResponse.json(
                { error: 'Voice service rate limit reached. Try again shortly.' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to generate voice audio' },
            { status: 500 }
        );
    }
}
```

### `GET /api/voice-agent` — Start Voice Call

Returns a signed WebSocket URL for the Conversational AI agent.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { hasElevenLabsKey, getVoiceAgentSignedUrl, DEFAULT_VOICE_ID } from '@/lib/elevenlabs';

export async function GET(req: NextRequest) {
    // Add your auth check here

    if (!hasElevenLabsKey()) {
        return NextResponse.json(
            { error: 'Voice feature is not configured.' },
            { status: 503 }
        );
    }

    try {
        const signedUrl = await getVoiceAgentSignedUrl();
        return NextResponse.json({
            signedUrl,
            voiceId: DEFAULT_VOICE_ID,
        });
    } catch (error: any) {
        console.error('Voice agent error:', error?.message || error);
        return NextResponse.json(
            { error: 'Failed to start voice agent' },
            { status: 500 }
        );
    }
}
```

### `POST /api/voice-agent` — End Voice Call (Optional Credit Deduction)

Called when a voice call ends to log duration or deduct credits.

```typescript
export async function POST(req: NextRequest) {
    // Add your auth check here

    try {
        const body = await req.json();
        const durationSeconds = body?.durationSeconds;

        if (typeof durationSeconds !== 'number' || durationSeconds < 0) {
            return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
        }

        const minutes = Math.max(1, Math.ceil(durationSeconds / 60));

        // Deduct credits or log usage here
        // await deductCredits(userId, minutes * costPerMinute, `voice_call: ${minutes} min`);

        return NextResponse.json({ message: 'Call ended', minutes });
    } catch (error: any) {
        console.error('Voice call end error:', error?.message || error);
        return NextResponse.json(
            { error: 'Failed to process call end' },
            { status: 500 }
        );
    }
}
```

---

## Client-Side: VoiceButton (TTS Read-Aloud)

A button that sends text to `/api/voice`, plays the returned audio, and falls back to browser `SpeechSynthesis` if the API fails.

### Key patterns:

1. **In-memory audio cache** — Avoids re-fetching audio for the same text
2. **Browser TTS fallback** — If the ElevenLabs API fails (rate limit, auth, network), falls back to `window.speechSynthesis` with a deep male voice
3. **Markdown stripping** — Cleans text client-side before browser fallback
4. **State machine** — `idle → loading → playing → idle` with error handling

```typescript
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

const audioCache = new Map<string, string>();

export const VoiceButton: React.FC<{ text: string; accessToken?: string }> = ({ text, accessToken }) => {
    const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setState('idle');
    }, []);

    const play = useCallback(async () => {
        if (audioRef.current && state === 'playing') { stop(); return; }

        setState('loading');

        try {
            // Cache key: text hash
            const cacheKey = text.length <= 200
                ? text
                : text.slice(0, 100) + '|' + text.length + '|' + text.slice(-100);
            let blobUrl = audioCache.get(cacheKey);

            if (!blobUrl) {
                const res = await fetch('/api/voice', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                    },
                    body: JSON.stringify({ text }),
                });

                if (!res.ok) throw new Error(`API returned ${res.status}`);

                const blob = await res.blob();
                blobUrl = URL.createObjectURL(blob);
                audioCache.set(cacheKey, blobUrl);
            }

            const audio = new Audio(blobUrl);
            audioRef.current = audio;
            audio.onended = () => { setState('idle'); audioRef.current = null; };
            audio.onerror = () => { setState('error'); audioRef.current = null; };
            await audio.play();
            setState('playing');
        } catch {
            // Fall back to browser SpeechSynthesis
            fallbackBrowserTTS(text);
        }
    }, [text, accessToken, state, stop]);

    if (!text || text.trim().length < 10) return null;

    return (
        <button onClick={play} disabled={state === 'loading'}>
            {state === 'playing' ? 'Stop' : state === 'loading' ? 'Loading...' : 'Listen'}
        </button>
    );
};

function fallbackBrowserTTS(text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 3000));
    utterance.rate = 1.05;
    utterance.pitch = 0.85;
    window.speechSynthesis.speak(utterance);
}
```

---

## Client-Side: VoiceCallModal (Conversational AI)

A full-screen modal for real-time voice conversations using the `@elevenlabs/react` hook.

### Key patterns:

1. **`useConversation` hook** — Manages the WebSocket connection, mic capture, audio playback, and turn-taking
2. **Signed URL flow** — Client fetches a signed URL from your API, then passes it to `conversation.startSession()`
3. **Session overrides** — Override agent config (first message, TTS settings) per-session without changing the agent
4. **Dynamic variables** — Pass context-specific data that the agent's prompt can reference
5. **Transcript logging** — `onMessage` callback captures both user and agent messages
6. **Duration tracking** — Timer starts on connect, credits deducted on disconnect

```typescript
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';

type CallPhase = 'idle' | 'connecting' | 'active' | 'ending' | 'error';

export const VoiceCallModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCallEnd?: (transcript: { role: 'user' | 'agent'; text: string }[], durationSeconds: number) => void;
    accessToken?: string;
}> = ({ isOpen, onClose, onCallEnd, accessToken }) => {
    const [callPhase, setCallPhase] = useState<CallPhase>('idle');
    const [conversationLog, setConversationLog] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
    const [callDuration, setCallDuration] = useState(0);
    const callStartTimeRef = useRef<number>(0);
    const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // The core hook — handles WebSocket, mic, audio, turn-taking
    const conversation = useConversation({
        onConnect: () => {
            setCallPhase('active');
            callStartTimeRef.current = Date.now();
            durationIntervalRef.current = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
            }, 1000);
        },
        onDisconnect: () => {
            clearInterval(durationIntervalRef.current!);
            const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
            onCallEnd?.([...conversationLog], duration);

            // Deduct credits
            if (duration > 0) {
                fetch('/api/voice-agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ durationSeconds: duration }),
                }).catch(console.error);
            }

            setCallPhase('idle');
        },
        onError: (message) => {
            if (message?.includes('microphone')) {
                // Show mic permission error to user
            }
            setCallPhase('error');
        },
        onMessage: ({ message, source }) => {
            if (!message) return;
            const role = source === 'user' ? 'user' as const : 'agent' as const;
            setConversationLog(prev => [...prev, { role, text: message }]);
        },
    });

    const { status, isSpeaking } = conversation;

    const startCall = useCallback(async () => {
        setCallPhase('connecting');
        setConversationLog([]);

        try {
            // 1. Fetch signed URL from your API
            const res = await fetch('/api/voice-agent', {
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            });
            if (!res.ok) { setCallPhase('error'); return; }
            const { signedUrl } = await res.json();

            // 2. Start the WebSocket voice session
            await conversation.startSession({
                signedUrl,
                overrides: {
                    agent: {
                        firstMessage: "Hey, how can I help you today?",
                    },
                    tts: {
                        stability: 0.35,
                        similarityBoost: 0.72,
                    },
                },
                // Pass dynamic context for the agent to use
                dynamicVariables: {
                    user_name: 'User',
                },
            });
        } catch {
            setCallPhase('error');
        }
    }, [conversation, accessToken]);

    const endCall = useCallback(async () => {
        setCallPhase('ending');
        await conversation.endSession().catch(console.error);
        setCallPhase('idle');
    }, [conversation]);

    // Volume control
    useEffect(() => {
        conversation.setVolume({ volume: 1 }); // 0-1
    }, [conversation]);

    // Cleanup on close/unmount
    useEffect(() => {
        if (!isOpen && status === 'connected') {
            conversation.endSession().catch(() => {});
        }
    }, [isOpen, status, conversation]);

    if (!isOpen) return null;

    return (
        <div>
            {/* Your modal UI here */}
            {/* status: 'connected' | 'connecting' | 'disconnected' */}
            {/* isSpeaking: boolean — true when agent audio is playing */}
            {/* callPhase: your app-level state for UI transitions */}
            <p>Status: {status}</p>
            <p>Agent speaking: {isSpeaking ? 'Yes' : 'No'}</p>
            <button onClick={callPhase === 'active' ? endCall : startCall}>
                {callPhase === 'active' ? 'End Call' : 'Start Call'}
            </button>
        </div>
    );
};
```

---

## Voice Settings Tuning Guide

The `voiceSettings` object controls how the voice sounds:

| Parameter | Range | Low Value | High Value | Recommended |
|---|---|---|---|---|
| `stability` | 0.0 - 1.0 | More expressive, dynamic, varied | More consistent, monotone | 0.30-0.45 for conversational |
| `similarityBoost` | 0.0 - 1.0 | Less like original voice | More like original voice | 0.70-0.85 |
| `style` | 0.0 - 1.0 | Neutral delivery | Very animated/expressive | 0.40-0.55 (only `eleven_multilingual_v2`) |
| `useSpeakerBoost` | boolean | — | — | `true` for clarity |

**For read-aloud TTS** (quality model):
```typescript
{ stability: 0.40, similarityBoost: 0.78, style: 0.50, useSpeakerBoost: true }
```

**For real-time streaming** (fast model):
```typescript
{ stability: 0.35, similarityBoost: 0.72, style: 0.45, useSpeakerBoost: true }
```

---

## Model Selection Guide

| Model | Use Case | Latency | Quality | Style Support |
|---|---|---|---|---|
| `eleven_turbo_v2_5` | Streaming, real-time calls, interactive | Lowest | Good | No |
| `eleven_multilingual_v2` | Read-aloud, pre-generated audio, polished | Higher | Best | Yes |

---

## Output Format Guide

| Format | Use Case | Quality | Size |
|---|---|---|---|
| `mp3_44100_128` | Read-aloud, downloadable audio | High (128kbps, 44.1kHz) | Larger |
| `mp3_22050_32` | Streaming, real-time playback | Lower (32kbps, 22kHz) | Smallest |

---

## Error Handling Patterns

1. **API key missing** — Check with `hasElevenLabsKey()` before any call, return 503
2. **Rate limiting** — ElevenLabs returns 429; surface a friendly retry message
3. **Auth failure** — Check for "API key" or "authentication" in error messages
4. **Microphone denied** — Client-side, check for "microphone" or "NotAllowed" in error messages
5. **Browser TTS fallback** — If the API fails for any reason, fall back to `window.speechSynthesis` so the user always hears something
6. **Text length cap** — Always truncate to ~5000 chars server-side to avoid excessive API costs

---

## Checklist for New Projects

1. Install `@elevenlabs/elevenlabs-js` and `@elevenlabs/react`
2. Set `ELEVENLABS_API_KEY` in your environment
3. Create `lib/elevenlabs.ts` with client setup, TTS functions, and `stripMarkdown`
4. Create `app/api/voice/route.ts` for TTS endpoint
5. (Optional) Create Conversational AI agent in ElevenLabs dashboard and set `ELEVENLABS_AGENT_ID`
6. (Optional) Create `app/api/voice-agent/route.ts` for voice call signed URL endpoint
7. Add `VoiceButton` component to any message/text you want to be read aloud
8. (Optional) Add `VoiceCallModal` for real-time voice conversations
9. Choose a voice from https://elevenlabs.io/voice-library and set the voice ID
10. Tune `voiceSettings` for your persona (see tuning guide above)
