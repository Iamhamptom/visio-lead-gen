'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X, Loader2 } from 'lucide-react';
import { VisioOrb } from './VisioOrb';

interface VoiceCallModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCallEnd?: (transcript: { role: 'user' | 'agent'; text: string }[], durationSeconds: number) => void;
    accessToken?: string;
    artistContext?: { name?: string; genre?: string; location?: string } | null;
}

type CallPhase = 'idle' | 'connecting' | 'active' | 'ending' | 'error';

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
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

    // Refs
    const logContainerRef = useRef<HTMLDivElement>(null);
    const callStartTimeRef = useRef<number>(0);
    const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const conversationLogRef = useRef<{ role: 'user' | 'agent'; text: string }[]>([]);
    const onCallEndRef = useRef(onCallEnd);
    const accessTokenRef = useRef(accessToken);

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

    // ElevenLabs Conversational AI hook
    const conversation = useConversation({
        onConnect: ({ conversationId }) => {
            console.log('Voice agent connected:', conversationId);
            setCallPhase('active');
            callStartTimeRef.current = Date.now();

            // Start duration timer
            durationIntervalRef.current = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
            }, 1000);
        },
        onDisconnect: () => {
            console.log('Voice agent disconnected');
            stopDurationTimer();
            const duration = callStartTimeRef.current > 0
                ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
                : 0;

            // Report call end with transcript and duration
            if (conversationLogRef.current.length > 0 && onCallEndRef.current) {
                onCallEndRef.current([...conversationLogRef.current], duration);
            }

            // Deduct credits for the call
            if (duration > 0) {
                deductCallCredits(duration);
            }

            setCallPhase('idle');
            callStartTimeRef.current = 0;
        },
        onError: (message, context) => {
            console.error('Voice agent error:', message, context);
            // Don't show raw error to user — keep it friendly
            if (message?.includes('microphone') || message?.includes('permission')) {
                setErrorMessage('Microphone access denied. Please allow mic access and try again.');
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

    // Deduct credits on the server
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

    // Format duration as mm:ss
    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Start a voice call
    const startCall = useCallback(async () => {
        setCallPhase('connecting');
        setConversationLog([]);
        setCallDuration(0);
        setErrorMessage('');

        try {
            // Fetch signed URL from our API
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
                    setErrorMessage(data.error || 'Could not connect to voice agent.');
                }
                setCallPhase('error');
                return;
            }

            const { signedUrl } = await res.json();

            // Build dynamic overrides with artist context
            const artistInfo = artistContext
                ? `\n\nARTIST CONTEXT:\nName: ${artistContext.name || 'Unknown'}\nGenre: ${artistContext.genre || 'Not specified'}\nLocation: ${artistContext.location || 'Not specified'}\nUse this context to personalize your responses and recommendations.`
                : '';

            // Start the ElevenLabs conversation session
            await conversation.startSession({
                signedUrl,
                overrides: {
                    agent: {
                        firstMessage: "V-Prai here, your publicist is on the line. So tell me — what are we making happen today?",
                    },
                    tts: {
                        stability: 0.35,
                        similarityBoost: 0.72,
                    },
                },
                dynamicVariables: artistContext ? {
                    artist_name: artistContext.name || '',
                    artist_genre: artistContext.genre || '',
                    artist_location: artistContext.location || '',
                } : undefined,
            });
        } catch (err: any) {
            console.error('Failed to start voice call:', err);
            if (err?.message?.includes('microphone') || err?.message?.includes('NotAllowed')) {
                setErrorMessage('Microphone access denied. Please allow mic access in your browser settings.');
            } else {
                setErrorMessage('Could not start voice call. Check your connection and try again.');
            }
            setCallPhase('error');
        }
    }, [conversation, artistContext]);

    // End the voice call
    const endCall = useCallback(async () => {
        setCallPhase('ending');
        try {
            await conversation.endSession();
        } catch (err) {
            console.error('Error ending session:', err);
        }
        setCallPhase('idle');
    }, [conversation]);

    // Mute / unmute
    const [isMuted, setIsMuted] = useState(false);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    // Audio volume toggle
    const [audioEnabled, setAudioEnabled] = useState(true);

    useEffect(() => {
        conversation.setVolume({ volume: audioEnabled ? 1 : 0 });
    }, [audioEnabled, conversation]);

    // Clean up on modal close
    useEffect(() => {
        if (!isOpen && status === 'connected') {
            conversation.endSession().catch(() => {});
            stopDurationTimer();
        }
    }, [isOpen, status, conversation]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (status === 'connected') {
                conversation.endSession().catch(() => {});
            }
            stopDurationTimer();
        };
    }, []);

    if (!isOpen) return null;

    const isActive = callPhase === 'active' || callPhase === 'connecting' || callPhase === 'ending';
    const isConnected = status === 'connected';

    // Determine display mode from agent state
    const agentMode = isSpeaking ? 'speaking' : (isConnected ? 'listening' : 'idle');

    const statusText = (() => {
        if (callPhase === 'error') return errorMessage || 'Call error';
        if (callPhase === 'ending') return 'Ending call...';
        if (callPhase === 'connecting' || status === 'connecting') return 'Connecting...';
        if (!isConnected) return 'Ready to call';
        if (isSpeaking) return 'V-Prai is speaking...';
        if (isMuted) return 'Muted';
        return 'Listening...';
    })();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                onClick={isActive ? undefined : () => { endCall(); onClose(); }}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                {/* Close button */}
                <button
                    onClick={() => { endCall(); onClose(); }}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="px-6 pt-6 pb-4 text-center">
                    <h3 className="text-lg font-semibold text-white">Voice Call</h3>
                    <p className="text-xs text-white/40 mt-1">
                        Talk to V-Prai hands-free
                        {isConnected && (
                            <span className="ml-2 text-visio-teal">{formatDuration(callDuration)}</span>
                        )}
                    </p>
                </div>

                {/* Orb + Status */}
                <div className="flex flex-col items-center py-6">
                    <div className={`relative ${
                        agentMode === 'speaking' ? 'scale-110' :
                        agentMode === 'listening' ? 'scale-105' :
                        'scale-100'
                    } transition-transform duration-500`}>
                        <VisioOrb active={isConnected} size="md" />
                        {agentMode === 'listening' && !isMuted && (
                            <div className="absolute inset-0 rounded-full border-2 border-visio-teal/50 animate-ping" />
                        )}
                    </div>

                    {/* Status */}
                    <div className="mt-4 flex items-center gap-2">
                        {(callPhase === 'connecting' || callPhase === 'ending') && (
                            <Loader2 size={14} className="animate-spin text-visio-teal" />
                        )}
                        {agentMode === 'listening' && !isMuted && (
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                        <span className={`text-sm font-medium ${
                            callPhase === 'error' ? 'text-red-400' :
                            agentMode === 'listening' && !isMuted ? 'text-visio-teal' :
                            'text-white/60'
                        }`}>
                            {statusText}
                        </span>
                    </div>

                    {/* Credit info */}
                    {isConnected && (
                        <div className="mt-2">
                            <span className="text-[10px] text-white/30">
                                1 credit per minute
                            </span>
                        </div>
                    )}
                </div>

                {/* Conversation Log */}
                {conversationLog.length > 0 && (
                    <div
                        ref={logContainerRef}
                        className="mx-6 mb-4 max-h-48 overflow-y-auto space-y-3 scrollbar-thin"
                    >
                        {conversationLog.map((entry, i) => (
                            <div
                                key={i}
                                className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                                    entry.role === 'user'
                                        ? 'bg-white/10 text-white/80 rounded-br-none'
                                        : 'bg-visio-teal/10 border border-visio-teal/20 text-white/70 rounded-bl-none'
                                }`}>
                                    {entry.text.length > 200 ? entry.text.slice(0, 200) + '...' : entry.text}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Controls */}
                <div className="px-6 pb-8 flex items-center justify-center gap-6">
                    {/* Mute button */}
                    <button
                        onClick={toggleMute}
                        disabled={!isConnected}
                        className={`p-4 rounded-full transition-all duration-200 ${
                            !isConnected
                                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                : isMuted
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    {/* Call / End Call button */}
                    {isActive ? (
                        <button
                            onClick={endCall}
                            className="p-5 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                            <PhoneOff size={24} />
                        </button>
                    ) : (
                        <button
                            onClick={startCall}
                            className="p-5 rounded-full bg-visio-teal hover:brightness-110 text-black shadow-lg shadow-visio-teal/30 hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                            <Phone size={24} />
                        </button>
                    )}

                    {/* Audio toggle */}
                    <button
                        onClick={() => setAudioEnabled(prev => !prev)}
                        className={`p-4 rounded-full transition-all duration-200 ${
                            audioEnabled
                                ? 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
                                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                        }`}
                    >
                        {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                </div>

                {/* Info note */}
                <div className="px-6 pb-4 text-center">
                    <p className="text-[10px] text-white/20">
                        Powered by ElevenLabs Conversational AI. Speak naturally — V-Prai handles the rest.
                    </p>
                </div>
            </div>
        </div>
    );
};
