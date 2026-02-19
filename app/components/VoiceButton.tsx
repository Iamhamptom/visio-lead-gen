'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Volume2, VolumeX, Loader2, Square } from 'lucide-react';

interface VoiceButtonProps {
    text: string;
    accessToken?: string;
}

/**
 * VoiceButton — Plays V-Prai's AI response aloud.
 * 1. Tries premium TTS via /api/voice for AI-generated voice.
 * 2. Falls back to browser SpeechSynthesis (deep male voice) if API fails.
 * Caches audio blobs per message text to avoid redundant API calls.
 */

// Simple in-memory cache to avoid re-fetching audio for the same text
const audioCache = new Map<string, string>();

/** Pick the best deep male English voice available in the browser */
function pickMaleVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    // Priority: deep/male English voices
    const malePrefNames = [
        'Google UK English Male', 'Google US English', 'Microsoft David',
        'Microsoft Mark', 'Daniel', 'James', 'Thomas', 'Fred', 'Alex',
    ];
    for (const name of malePrefNames) {
        const v = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
        if (v) return v;
    }
    // Fallback: any English male-sounding voice (heuristic: name contains 'Male')
    const male = voices.find(v => v.name.includes('Male') && v.lang.startsWith('en'));
    if (male) return male;
    // Last resort: any English voice
    return voices.find(v => v.lang.startsWith('en')) || null;
}

/** Strip markdown formatting so TTS reads clean text */
function stripMarkdownForSpeech(text: string): string {
    return text
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
        .replace(/\|/g, ', ')
        .replace(/^[-:| ]+$/gm, '')
        .replace(/^---+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ text, accessToken }) => {
    const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isLoadingRef = useRef(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Cleanup on unmount — stop any playing audio
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (utteranceRef.current && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                utteranceRef.current = null;
            }
        };
    }, []);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        if (utteranceRef.current && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            utteranceRef.current = null;
        }
        setState('idle');
        setErrorMsg(null);
    }, []);

    /** Fallback: use browser SpeechSynthesis with best available male voice */
    const playBrowserTTS = useCallback((cleanText: string) => {
        if (!('speechSynthesis' in window)) {
            setErrorMsg('No voice support in this browser');
            setState('error');
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 3000));
        utterance.rate = 1.05;   // Slightly faster than default for snappy delivery
        utterance.pitch = 0.85;  // Lower pitch for deeper male voice
        utterance.volume = 1.0;

        const voice = pickMaleVoice();
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
            setState('idle');
            utteranceRef.current = null;
        };
        utterance.onerror = () => {
            setErrorMsg('Browser voice failed');
            setState('error');
            utteranceRef.current = null;
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setState('playing');
    }, []);

    const play = useCallback(async () => {
        // If in error state, clicking retries — reset first
        if (state === 'error') {
            setState('idle');
            setErrorMsg(null);
        }

        // If already playing, stop
        if ((audioRef.current || utteranceRef.current) && state === 'playing') {
            stop();
            return;
        }

        // Don't allow double-click while loading
        if (isLoadingRef.current) return;

        isLoadingRef.current = true;
        setState('loading');
        setErrorMsg(null);

        const cleanText = stripMarkdownForSpeech(text);

        try {
            // Cache key uses text length + start + end to avoid collisions
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

                if (!res.ok) {
                    // API failed — fall back to browser TTS silently
                    console.warn('Voice API failed (status', res.status, '), using browser TTS');
                    isLoadingRef.current = false;
                    playBrowserTTS(cleanText);
                    return;
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
                // Premium TTS audio failed to play — try browser TTS
                audioRef.current = null;
                playBrowserTTS(cleanText);
            };

            await audio.play();
            setState('playing');
        } catch (err: any) {
            console.warn('Voice API error, falling back to browser TTS:', err?.message);
            // Fall back to browser TTS on any error
            playBrowserTTS(cleanText);
        } finally {
            isLoadingRef.current = false;
        }
    }, [text, accessToken, state, stop, playBrowserTTS]);

    // Don't render if text is too short to be worth reading aloud
    if (!text || text.trim().length < 10) return null;

    const iconSize = 15;

    // Button label based on state
    const label = state === 'playing' ? 'Stop'
        : state === 'loading' ? 'Loading'
        : state === 'error' ? (errorMsg && errorMsg.length <= 20 ? errorMsg : 'Failed')
        : 'Listen';

    return (
        <button
            onClick={play}
            disabled={state === 'loading'}
            title={
                state === 'playing' ? 'Stop voice' :
                state === 'loading' ? 'Generating voice...' :
                state === 'error' ? (errorMsg || 'Voice failed') + ' — click to retry' :
                'Listen to this response'
            }
            className={`
                inline-flex items-center justify-center gap-1.5
                px-2.5 py-1 rounded-lg
                text-[10px] font-medium uppercase tracking-wider
                transition-all duration-200
                ${state === 'playing'
                    ? 'bg-visio-teal/20 text-visio-teal border border-visio-teal/40 shadow-[0_0_8px_rgba(182,240,156,0.3)]'
                    : state === 'error'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                    : state === 'loading'
                    ? 'bg-white/5 text-white/40 border border-white/10 cursor-wait'
                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-visio-teal/10 hover:text-visio-teal hover:border-visio-teal/30'
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
            {label}
        </button>
    );
};
