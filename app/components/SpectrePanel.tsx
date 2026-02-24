'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Sound Effects ───────────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
    if (!_audioCtx) _audioCtx = new AudioContext();
    return _audioCtx;
}

/** Soft click sound for button presses */
function playClick() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
    } catch { /* silent fail in unsupported envs */ }
}

/** Connection / activation sound — ascending tone */
function playConnect() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    } catch {}
}

/** Disconnect sound — descending tone */
function playDisconnect() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
    } catch {}
}

// ─── Spectre Introduction Text (TTS) ─────────────────────────────────────────

const SPECTRE_INTRO = `Welcome to Visio. I'm Spectre, your personal AI voice assistant. This platform gives independent artists the same firepower that major labels have. We find you the right playlist curators, journalists, bloggers, and influencers. We draft pitch perfect emails, plan full PR campaigns, and track your reach across every platform. Whether you're pushing a new single or building your brand from scratch, I'm here to make it happen. Just start talking to me or use the chat. Let's make some noise.`;

// ─── Types ───────────────────────────────────────────────────────────────────

interface SpectrePanelProps {
    isOpen: boolean;
    onClose: () => void;
    onCallEnd?: (transcript: { role: 'user' | 'agent'; text: string }[], durationSeconds: number) => void;
    accessToken?: string;
    artistContext?: { name?: string; genre?: string; location?: string } | null;
}

type CallPhase = 'idle' | 'intro' | 'connecting' | 'active' | 'ending' | 'error';

// ─── Spectre Orb ─────────────────────────────────────────────────────────────

const SpectreOrb: React.FC<{
    isConnected: boolean;
    isSpeaking: boolean;
    isIntroPlaying: boolean;
    isMuted: boolean;
    callPhase: CallPhase;
}> = ({ isConnected, isSpeaking, isIntroPlaying, isMuted, callPhase }) => {
    const isActive = isConnected || callPhase === 'connecting';
    const showSpeaking = isSpeaking || isIntroPlaying;

    return (
        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            {/* Background glow */}
            <div
                className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${
                    showSpeaking
                        ? 'bg-visio-teal/40 scale-[2] opacity-100'
                        : isActive
                        ? 'bg-visio-teal/20 scale-150 opacity-80 spectre-breathe'
                        : 'bg-visio-teal/10 scale-100 opacity-40 spectre-breathe'
                }`}
            />

            {/* Outer ring 1 — slow reverse spin */}
            <div
                className={`absolute inset-0 rounded-full border transition-all duration-700 ${
                    showSpeaking
                        ? 'border-visio-teal/50 border-t-visio-accent border-l-transparent animate-spin opacity-100'
                        : isActive
                        ? 'border-visio-teal/30 border-t-visio-teal border-l-transparent animate-spin opacity-100'
                        : 'border-visio-teal/15 border-t-visio-teal/30 border-l-transparent animate-spin opacity-40'
                }`}
                style={{
                    animationDuration: showSpeaking ? '2s' : isActive ? '3s' : '8s',
                    animationDirection: 'reverse',
                }}
            />

            {/* Outer ring 2 — forward spin */}
            <div
                className={`absolute inset-1 rounded-full border border-visio-accent/20 border-b-visio-accent/60 border-r-transparent transition-all duration-700 ${
                    isActive || showSpeaking ? 'animate-spin opacity-100' : 'opacity-0'
                }`}
                style={{ animationDuration: '4s' }}
            />

            {/* Middle ring — fast spin */}
            <div
                className={`absolute inset-3 rounded-full border-2 border-transparent border-r-visio-accent border-b-visio-accent/50 transition-all duration-700 ${
                    isActive || showSpeaking ? 'animate-spin opacity-100' : 'opacity-0'
                }`}
                style={{ animationDuration: isActive ? '1.5s' : '5s' }}
            />

            {/* Speaking pulse rings */}
            {showSpeaking && (
                <>
                    <div className="absolute inset-0 rounded-full border-2 border-visio-teal/40 spectre-pulse-ring" />
                    <div className="absolute inset-0 rounded-full border border-visio-teal/20 spectre-pulse-ring" style={{ animationDelay: '0.5s' }} />
                </>
            )}

            {/* Listening indicator */}
            {isConnected && !showSpeaking && !isMuted && (
                <div className="absolute inset-0 rounded-full border-2 border-visio-teal/40 animate-ping" style={{ animationDuration: '2s' }} />
            )}

            {/* Core orb */}
            <div
                className={`relative w-14 h-14 rounded-full transition-all duration-500 ${
                    showSpeaking
                        ? 'scale-110 brightness-150 spectre-core-speaking'
                        : isActive
                        ? 'scale-100 brightness-125 animate-pulse'
                        : 'scale-95 brightness-90 animate-pulse'
                }`}
                style={{
                    background: showSpeaking
                        ? 'radial-gradient(circle at 40% 40%, #B6F09C, #608A94, #3a5f6a)'
                        : isActive
                        ? 'radial-gradient(circle at 40% 40%, #608A94, #B6F09C, #3a5f6a)'
                        : 'radial-gradient(circle at 40% 40%, #4a7a8a, #3a5f6a)',
                    boxShadow: showSpeaking
                        ? '0 0 40px rgba(182, 240, 156, 0.6), 0 0 80px rgba(96, 138, 148, 0.3)'
                        : isActive
                        ? '0 0 30px rgba(96, 138, 148, 0.4)'
                        : '0 0 15px rgba(96, 138, 148, 0.25)',
                    animationDuration: '3s',
                }}
            >
                <div
                    className={`absolute inset-0 bg-white/25 blur-sm rounded-full ${isActive || showSpeaking ? 'animate-pulse' : ''}`}
                    style={{ animationDuration: '2s' }}
                />
            </div>

            {/* Audio visualizer bars */}
            {showSpeaking && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-[3px]">
                    {[0, 1, 2, 3, 4, 5, 6].map(i => (
                        <div
                            key={i}
                            className="w-[3px] rounded-full bg-visio-teal spectre-audio-bar"
                            style={{
                                animationDelay: `${i * 0.08}s`,
                                animationDuration: `${0.4 + (i % 3) * 0.15}s`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Muted overlay */}
            {isMuted && isConnected && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-red-500/20 rounded-full p-2 backdrop-blur-sm">
                        <MicOff size={16} className="text-red-400" />
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Spectre Panel (Sidebar) ─────────────────────────────────────────────────

export const SpectrePanel: React.FC<SpectrePanelProps> = ({
    isOpen,
    onClose,
    onCallEnd,
    accessToken,
    artistContext,
}) => {
    const [callPhase, setCallPhase] = useState<CallPhase>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [conversationLog, setConversationLog] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
    const [callDuration, setCallDuration] = useState(0);
    const [isIntroPlaying, setIsIntroPlaying] = useState(false);
    const [introPlayed, setIntroPlayed] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);

    // Refs
    const logContainerRef = useRef<HTMLDivElement>(null);
    const callStartTimeRef = useRef<number>(0);
    const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const conversationLogRef = useRef<{ role: 'user' | 'agent'; text: string }[]>([]);
    const onCallEndRef = useRef(onCallEnd);
    const accessTokenRef = useRef(accessToken);
    const introAudioRef = useRef<HTMLAudioElement | null>(null);

    // Keep refs in sync
    useEffect(() => { onCallEndRef.current = onCallEnd; }, [onCallEnd]);
    useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);
    useEffect(() => { conversationLogRef.current = conversationLog; }, [conversationLog]);

    // Scroll log to bottom
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [conversationLog]);

    // ─── Auto-play introduction when panel first opens ───
    useEffect(() => {
        if (isOpen && !introPlayed && callPhase === 'idle') {
            const timer = setTimeout(() => {
                playIntroduction();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [isOpen, introPlayed, callPhase]);

    /** Play the TTS introduction using /api/voice */
    const playIntroduction = useCallback(async () => {
        if (introPlayed || isIntroPlaying) return;

        setIsIntroPlaying(true);
        setCallPhase('intro');
        playConnect();

        try {
            const token = accessTokenRef.current;
            const res = await fetch('/api/voice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ text: SPECTRE_INTRO, streaming: false }),
            });

            if (!res.ok) {
                playIntroFallback();
                return;
            }

            const audioBlob = await res.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            introAudioRef.current = audio;

            audio.onended = () => {
                setIsIntroPlaying(false);
                setCallPhase('idle');
                setIntroPlayed(true);
                URL.revokeObjectURL(audioUrl);
            };

            audio.onerror = () => {
                setIsIntroPlaying(false);
                setCallPhase('idle');
                setIntroPlayed(true);
                playIntroFallback();
            };

            await audio.play();
        } catch {
            playIntroFallback();
        }
    }, [introPlayed, isIntroPlaying]);

    /** Fallback: browser SpeechSynthesis for the intro */
    const playIntroFallback = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            setIsIntroPlaying(false);
            setCallPhase('idle');
            setIntroPlayed(true);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(SPECTRE_INTRO);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const femaleNames = ['Google UK English Female', 'Samantha', 'Karen', 'Victoria', 'Zira'];
        for (const name of femaleNames) {
            const v = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
            if (v) { utterance.voice = v; break; }
        }
        if (!utterance.voice) {
            const any = voices.find(v => v.lang.startsWith('en'));
            if (any) utterance.voice = any;
        }

        utterance.onend = () => {
            setIsIntroPlaying(false);
            setCallPhase('idle');
            setIntroPlayed(true);
        };

        window.speechSynthesis.speak(utterance);
    }, []);

    // Voice conversation hook — ElevenLabs Conversational AI
    const conversation = useConversation({
        onConnect: ({ conversationId }) => {
            console.log('Spectre connected:', conversationId);
            setCallPhase('active');
            playConnect();
            callStartTimeRef.current = Date.now();

            durationIntervalRef.current = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
            }, 1000);
        },
        onDisconnect: () => {
            console.log('Spectre disconnected');
            playDisconnect();
            stopDurationTimer();
            const duration = callStartTimeRef.current > 0
                ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
                : 0;

            if (conversationLogRef.current.length > 0 && onCallEndRef.current) {
                onCallEndRef.current([...conversationLogRef.current], duration);
            }

            if (duration > 0) {
                deductCallCredits(duration);
            }

            setCallPhase('idle');
            callStartTimeRef.current = 0;
        },
        onError: (message, context) => {
            console.error('Spectre voice error:', message, context);
            if (message?.includes('microphone') || message?.includes('permission')) {
                setErrorMessage('Microphone access needed. Please allow mic access in your browser and try again.');
            } else {
                setErrorMessage('Connection issue. Please try again.');
            }
            setCallPhase('error');
            stopDurationTimer();
        },
        onMessage: ({ message, source }) => {
            if (!message) return;
            const role = source === 'user' ? 'user' as const : 'agent' as const;
            setConversationLog(prev => [...prev, { role, text: message }]);
        },
    });

    const { status, isSpeaking } = conversation;

    const deductCallCredits = async (durationSeconds: number) => {
        try {
            const token = accessTokenRef.current;
            await fetch('/api/voice-agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ durationSeconds }),
            });
        } catch (err) {
            console.error('Failed to deduct call credits:', err);
        }
    };

    const stopDurationTimer = () => {
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // ─── Start two-way voice call ───
    const startCall = useCallback(async () => {
        playClick();

        // Stop intro audio if still playing
        if (introAudioRef.current) {
            introAudioRef.current.pause();
            introAudioRef.current = null;
        }
        if (isIntroPlaying) {
            window.speechSynthesis?.cancel();
            setIsIntroPlaying(false);
        }
        setIntroPlayed(true);

        setCallPhase('connecting');
        setConversationLog([]);
        setCallDuration(0);
        setErrorMessage('');

        // Request microphone permission BEFORE starting ElevenLabs session
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Release — ElevenLabs SDK will open its own stream via WebRTC
            stream.getTracks().forEach(t => t.stop());
        } catch (micErr: any) {
            console.error('Mic permission denied:', micErr);
            setErrorMessage('Microphone access is required for voice calls. Please allow mic access in your browser settings and try again.');
            setCallPhase('error');
            return;
        }

        try {
            const token = accessTokenRef.current;
            const res = await fetch('/api/voice-agent', {
                method: 'GET',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (res.status === 402) {
                    setErrorMessage(data.error || 'Not enough credits for a voice call.');
                } else {
                    setErrorMessage(data.error || 'Could not connect to Spectre.');
                }
                setCallPhase('error');
                return;
            }

            const { signedUrl } = await res.json();

            await conversation.startSession({
                signedUrl,
                overrides: {
                    agent: {
                        firstMessage: artistContext?.name
                            ? `Hey ${artistContext.name}, Spectre here. What are we working on?`
                            : "Spectre here. I'm ready — what are we working on?",
                    },
                    tts: {
                        stability: 0.50,
                        similarityBoost: 0.75,
                    },
                },
                dynamicVariables: artistContext ? {
                    artist_name: artistContext.name || '',
                    artist_genre: artistContext.genre || '',
                    artist_location: artistContext.location || '',
                } : undefined,
            });
        } catch (err: any) {
            console.error('Failed to start Spectre voice call:', err);
            if (err?.message?.includes('microphone') || err?.message?.includes('NotAllowed')) {
                setErrorMessage('Microphone access needed. Please allow mic access in your browser settings.');
            } else {
                setErrorMessage('Could not start voice call. Check your connection and try again.');
            }
            setCallPhase('error');
        }
    }, [conversation, artistContext, isIntroPlaying]);

    const endCall = useCallback(async () => {
        playClick();
        setCallPhase('ending');
        try {
            await conversation.endSession();
        } catch (err) {
            console.error('Error ending session:', err);
        }
        setCallPhase('idle');
    }, [conversation]);

    const toggleMute = useCallback(() => {
        playClick();
        setIsMuted(prev => !prev);
    }, []);

    useEffect(() => {
        conversation.setVolume({ volume: audioEnabled ? 1 : 0 });
    }, [audioEnabled, conversation]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (status === 'connected') {
                conversation.endSession().catch(() => {});
            }
            stopDurationTimer();
            if (introAudioRef.current) {
                introAudioRef.current.pause();
            }
        };
    }, []);

    const isActive = callPhase === 'active' || callPhase === 'connecting' || callPhase === 'ending';
    const isConnected = status === 'connected';

    const statusText = (() => {
        if (callPhase === 'error') return errorMessage || 'Connection error';
        if (callPhase === 'ending') return 'Ending call...';
        if (callPhase === 'intro') return 'Spectre is introducing herself...';
        if (callPhase === 'connecting' || status === 'connecting') return 'Connecting...';
        if (!isConnected && callPhase === 'idle') return introPlayed ? 'Ready — tap to start a conversation' : 'Initializing...';
        if (isSpeaking) return 'Spectre is speaking...';
        if (isMuted) return 'Muted';
        return 'Listening...';
    })();

    return (
        <>
            {/* Sidebar Panel */}
            <div
                className={`fixed top-0 right-0 h-full z-[90] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
                style={{ width: '360px' }}
            >
                <div className="h-full flex flex-col bg-[#060606]/95 backdrop-blur-2xl border-l border-white/8 shadow-[-20px_0_60px_rgba(0,0,0,0.5)]">

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                                isConnected ? 'bg-visio-teal shadow-[0_0_8px_rgba(96,138,148,0.6)]' :
                                callPhase === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                                isIntroPlaying ? 'bg-visio-accent animate-pulse' :
                                'bg-white/25'
                            }`} />
                            <div>
                                <h3 className="text-sm font-semibold text-white tracking-wide">Spectre</h3>
                                <p className="text-[10px] text-white/30 font-medium">
                                    {isConnected ? 'Call Active' : isIntroPlaying ? 'Speaking' : 'Voice Assistant'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isConnected && (
                                <span className="text-xs text-visio-teal font-mono font-medium">
                                    {formatDuration(callDuration)}
                                </span>
                            )}
                            <button
                                onClick={() => { playClick(); onClose(); }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Orb Section */}
                    <div className="flex flex-col items-center py-6 px-5">
                        <SpectreOrb
                            isConnected={isConnected}
                            isSpeaking={isSpeaking}
                            isIntroPlaying={isIntroPlaying}
                            isMuted={isMuted}
                            callPhase={callPhase}
                        />

                        {/* Status */}
                        <div className="mt-5 flex items-center gap-2 min-h-[20px]">
                            {(callPhase === 'connecting' || callPhase === 'ending') && (
                                <Loader2 size={13} className="animate-spin text-visio-teal" />
                            )}
                            {isConnected && !isSpeaking && !isMuted && (
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            )}
                            <span className={`text-xs font-medium transition-colors duration-300 ${
                                callPhase === 'error' ? 'text-red-400' :
                                isSpeaking || isIntroPlaying ? 'text-visio-accent' :
                                isConnected && !isMuted ? 'text-visio-teal' :
                                'text-white/40'
                            }`}>
                                {statusText}
                            </span>
                        </div>

                        {/* Credit info */}
                        {isConnected && (
                            <div className="mt-1.5">
                                <span className="text-[9px] text-white/20 uppercase tracking-wider">
                                    1 credit / min
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Conversation Log */}
                    <div className="flex-1 min-h-0 px-4 pb-3">
                        {conversationLog.length > 0 ? (
                            <div
                                ref={logContainerRef}
                                className="h-full overflow-y-auto space-y-2.5 pr-1 spectre-scroll"
                            >
                                {conversationLog.map((entry, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[88%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${
                                            entry.role === 'user'
                                                ? 'bg-white/8 text-white/70 rounded-br-sm'
                                                : 'bg-visio-teal/8 border border-visio-teal/15 text-white/65 rounded-bl-sm'
                                        }`}>
                                            {entry.role === 'agent' && (
                                                <span className="text-visio-teal/60 text-[9px] font-semibold uppercase tracking-wider block mb-0.5">Spectre</span>
                                            )}
                                            {entry.text.length > 250 ? entry.text.slice(0, 250) + '...' : entry.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center px-6">
                                {callPhase === 'intro' && (
                                    <p className="text-visio-accent/60 text-xs leading-relaxed animate-pulse">
                                        Spectre is introducing herself...
                                    </p>
                                )}
                                {callPhase === 'idle' && (
                                    <>
                                        <p className="text-white/25 text-xs leading-relaxed">
                                            {introPlayed
                                                ? 'Tap the call button below to start a two-way voice conversation with Spectre.'
                                                : 'Spectre is your AI voice assistant. She knows everything about Visio.'
                                            }
                                        </p>
                                        <p className="text-white/15 text-[10px] mt-2 leading-relaxed">
                                            Leads, campaigns, pitches, strategy — just ask.
                                        </p>
                                    </>
                                )}
                                {callPhase === 'error' && (
                                    <div className="space-y-2">
                                        <p className="text-red-400/70 text-xs leading-relaxed">
                                            {errorMessage || 'Something went wrong.'}
                                        </p>
                                        <button
                                            onClick={() => { setCallPhase('idle'); setErrorMessage(''); }}
                                            className="text-[10px] text-visio-teal/60 hover:text-visio-teal underline"
                                        >
                                            Try again
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex-shrink-0 px-5 pb-6 pt-3 border-t border-white/5">
                        <div className="flex items-center justify-center gap-5">
                            {/* Mute button */}
                            <button
                                onClick={toggleMute}
                                disabled={!isConnected}
                                className={`p-3.5 rounded-full transition-all duration-200 ${
                                    !isConnected
                                        ? 'bg-white/5 text-white/15 cursor-not-allowed'
                                        : isMuted
                                        ? 'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25'
                                        : 'bg-white/5 text-white/50 border border-white/8 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>

                            {/* Call / End Call button */}
                            {isActive ? (
                                <button
                                    onClick={endCall}
                                    className="p-5 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 hover:scale-105 active:scale-95 transition-all duration-200"
                                >
                                    <PhoneOff size={22} />
                                </button>
                            ) : (
                                <button
                                    onClick={startCall}
                                    disabled={callPhase === 'intro'}
                                    className={`p-5 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 ${
                                        callPhase === 'intro'
                                            ? 'bg-visio-teal/50 text-black/50 cursor-wait shadow-visio-teal/10'
                                            : 'bg-visio-teal hover:brightness-110 text-black shadow-visio-teal/25'
                                    }`}
                                >
                                    <Phone size={22} />
                                </button>
                            )}

                            {/* Audio toggle */}
                            <button
                                onClick={() => { playClick(); setAudioEnabled(prev => !prev); }}
                                className={`p-3.5 rounded-full transition-all duration-200 ${
                                    audioEnabled
                                        ? 'bg-white/5 text-white/50 border border-white/8 hover:bg-white/10 hover:text-white'
                                        : 'bg-orange-500/15 text-orange-400 border border-orange-500/25 hover:bg-orange-500/25'
                                }`}
                            >
                                {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                            </button>
                        </div>

                        <p className="text-center text-[9px] text-white/15 mt-4 font-medium tracking-wide">
                            Speak naturally — Spectre handles the rest.
                        </p>
                    </div>
                </div>
            </div>

            {/* Floating toggle button — always visible when panel is closed */}
            {!isOpen && (
                <button
                    onClick={() => { playClick(); onClose(); }}
                    className={`fixed right-0 top-1/2 -translate-y-1/2 z-[89] transition-all duration-300 group ${
                        isConnected ? 'spectre-fab-active' : ''
                    }`}
                >
                    <div className={`flex items-center gap-2 pl-3 pr-2 py-3 rounded-l-2xl border border-r-0 transition-all duration-300 ${
                        isConnected
                            ? 'bg-visio-teal/15 border-visio-teal/30 shadow-[-4px_0_20px_rgba(96,138,148,0.15)]'
                            : 'bg-[#0a0a0a]/90 border-white/8 hover:bg-white/5 hover:border-white/15'
                    }`}>
                        <div className={`w-5 h-5 rounded-full transition-all duration-500 ${
                            isSpeaking
                                ? 'bg-gradient-to-tr from-visio-accent to-visio-teal shadow-[0_0_12px_rgba(182,240,156,0.5)] scale-110'
                                : isConnected
                                ? 'bg-gradient-to-tr from-visio-teal to-visio-accent shadow-[0_0_8px_rgba(96,138,148,0.4)] animate-pulse'
                                : 'bg-gradient-to-tr from-visio-teal/50 to-visio-accent/30'
                        }`} style={{ animationDuration: '2.5s' }} />
                        <ChevronLeft size={14} className={`transition-colors ${
                            isConnected ? 'text-visio-teal' : 'text-white/30 group-hover:text-white/60'
                        }`} />
                    </div>
                </button>
            )}
        </>
    );
};
