'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Loader2, Square } from 'lucide-react';

interface VoiceButtonProps {
    text: string;
    accessToken?: string;
}

/**
 * VoiceButton — Plays V-Prai's AI response aloud using ElevenLabs TTS.
 * Shows a speaker icon that toggles between play/stop states.
 * Caches audio blobs per message text to avoid redundant API calls.
 */

// Simple in-memory cache to avoid re-fetching audio for the same text
const audioCache = new Map<string, string>();

export const VoiceButton: React.FC<VoiceButtonProps> = ({ text, accessToken }) => {
    const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setState('idle');
    }, []);

    const play = useCallback(async () => {
        // If already playing, stop
        if (state === 'playing') {
            stop();
            return;
        }

        // Don't allow double-click while loading
        if (state === 'loading') return;

        setState('loading');

        try {
            // Cache key is first 200 chars (enough to identify unique messages)
            const cacheKey = text.slice(0, 200);
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

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error((err as any)?.error || 'Voice generation failed');
                }

                const blob = await res.blob();
                blobUrl = URL.createObjectURL(blob);
                audioCache.set(cacheKey, blobUrl);
            }

            const audio = new Audio(blobUrl);
            audioRef.current = audio;

            audio.onended = () => {
                setState('idle');
                audioRef.current = null;
            };

            audio.onerror = () => {
                setState('error');
                audioRef.current = null;
            };

            await audio.play();
            setState('playing');
        } catch (err: any) {
            console.error('Voice playback error:', err?.message || err);
            setState('error');

            // Reset error state after 2s so the user can retry
            setTimeout(() => setState('idle'), 2000);
        }
    }, [text, accessToken, state, stop]);

    // Don't render if text is too short to be worth reading aloud
    if (!text || text.trim().length < 10) return null;

    const iconSize = 13;

    return (
        <button
            onClick={play}
            disabled={state === 'loading'}
            title={
                state === 'playing' ? 'Stop voice' :
                state === 'loading' ? 'Generating voice...' :
                state === 'error' ? 'Voice failed — click to retry' :
                'Listen to this response'
            }
            className={`
                inline-flex items-center justify-center
                w-7 h-7 rounded-full
                transition-all duration-200
                ${state === 'playing'
                    ? 'bg-visio-teal/20 text-visio-teal border border-visio-teal/40 shadow-[0_0_8px_rgba(182,240,156,0.3)]'
                    : state === 'error'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : state === 'loading'
                    ? 'bg-white/5 text-white/40 border border-white/10 cursor-wait'
                    : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/70 hover:border-white/20'
                }
            `}
        >
            {state === 'loading' ? (
                <Loader2 size={iconSize} className="animate-spin" />
            ) : state === 'playing' ? (
                <Square size={iconSize - 2} className="fill-current" />
            ) : state === 'error' ? (
                <VolumeX size={iconSize} />
            ) : (
                <Volume2 size={iconSize} />
            )}
        </button>
    );
};
