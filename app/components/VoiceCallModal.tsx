'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X, Loader2 } from 'lucide-react';
import { VisioOrb } from './VisioOrb';

interface VoiceCallModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSendMessage: (text: string) => Promise<string>;
    onCallEnd?: (transcript: { role: 'user' | 'agent'; text: string }[]) => void;
    accessToken?: string;
}

type CallState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
    isOpen,
    onClose,
    onSendMessage,
    onCallEnd,
    accessToken,
}) => {
    const [callState, setCallState] = useState<CallState>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [conversationLog, setConversationLog] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [audioEnabled, setAudioEnabled] = useState(true);

    // ── Refs ──
    const recognitionRef = useRef<any>(null);
    const interruptRecognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const callActiveRef = useRef(false);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const conversationLogRef = useRef<{ role: 'user' | 'agent'; text: string }[]>([]);
    const isMutedRef = useRef(false);
    const audioEnabledRef = useRef(true);
    const accessTokenRef = useRef(accessToken);
    const onSendMessageRef = useRef(onSendMessage);
    const onCallEndRef = useRef(onCallEnd);

    // Generation ID — increments each turn. Stale callbacks check this to avoid acting on old data.
    const generationIdRef = useRef(0);

    // Abort controller for cancelling in-flight agent requests on interruption
    const agentAbortRef = useRef<AbortController | null>(null);

    // Flag: was the current audio interrupted? Prevents onended from double-restarting listening.
    const wasInterruptedRef = useRef(false);

    // Keep refs in sync with state/props
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);
    useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);
    useEffect(() => { onSendMessageRef.current = onSendMessage; }, [onSendMessage]);
    useEffect(() => { onCallEndRef.current = onCallEnd; }, [onCallEnd]);
    useEffect(() => { conversationLogRef.current = conversationLog; }, [conversationLog]);

    // Scroll conversation log to bottom
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [conversationLog]);

    // ── Core function refs (break circular callback deps) ──

    const stopCallRef = useRef<() => void>(() => {});
    const startListeningRef = useRef<() => void>(() => {});
    const speakResponseRef = useRef<(text: string) => Promise<void>>(async () => {});
    const processUserInputRef = useRef<(text: string) => Promise<void>>(async () => {});
    const startInterruptionListenerRef = useRef<() => void>(() => {});
    const stopInterruptionListenerRef = useRef<() => void>(() => {});

    // ── Helper: kill any active speech recognition instance ──
    const killRecognition = (ref: React.MutableRefObject<any>) => {
        if (ref.current) {
            try { ref.current.stop(); } catch {}
            ref.current = null;
        }
    };

    // ── Helper: cancel in-flight agent request ──
    const cancelAgentRequest = () => {
        if (agentAbortRef.current) {
            agentAbortRef.current.abort();
            agentAbortRef.current = null;
        }
    };

    // ── Helper: stop all audio playback ──
    const stopAllAudio = () => {
        wasInterruptedRef.current = true;
        if (audioRef.current) {
            audioRef.current.pause();
            if (audioRef.current.src) {
                URL.revokeObjectURL(audioRef.current.src);
            }
            audioRef.current = null;
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    };

    // ── stopInterruptionListener ──
    stopInterruptionListenerRef.current = () => {
        killRecognition(interruptRecognitionRef);
    };

    // ── stopCall — tear down everything ──
    stopCallRef.current = () => {
        callActiveRef.current = false;
        generationIdRef.current += 1;

        // Fire onCallEnd before clearing state
        if (conversationLogRef.current.length > 0 && onCallEndRef.current) {
            onCallEndRef.current([...conversationLogRef.current]);
        }

        killRecognition(recognitionRef);
        stopInterruptionListenerRef.current();
        cancelAgentRequest();
        stopAllAudio();

        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        setCallState('idle');
        setTranscript('');
    };

    // ── startInterruptionListener — listen for user speech while agent is speaking ──
    startInterruptionListenerRef.current = () => {
        if (!callActiveRef.current || isMutedRef.current) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        // Kill existing first
        stopInterruptionListenerRef.current();

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        const myGenId = generationIdRef.current;

        recognition.onresult = () => {
            // Stale check
            if (generationIdRef.current !== myGenId || !callActiveRef.current) return;

            // User is speaking — interrupt everything
            stopAllAudio();
            cancelAgentRequest();
            killRecognition(interruptRecognitionRef);

            // Switch to main listening
            if (callActiveRef.current) {
                setCallState('listening');
                startListeningRef.current();
            }
        };

        recognition.onerror = (event: any) => {
            if (generationIdRef.current !== myGenId || !callActiveRef.current) return;
            interruptRecognitionRef.current = null;

            // On no-speech or aborted, restart quickly if agent is still speaking
            if (event.error === 'no-speech' || event.error === 'aborted') {
                const isStillSpeaking = audioRef.current || ('speechSynthesis' in window && window.speechSynthesis.speaking);
                if (callActiveRef.current && isStillSpeaking) {
                    setTimeout(() => {
                        if (generationIdRef.current === myGenId && callActiveRef.current) {
                            startInterruptionListenerRef.current();
                        }
                    }, 100); // Faster restart — 100ms instead of 300ms
                }
            }
        };

        recognition.onend = () => {
            if (generationIdRef.current !== myGenId || !callActiveRef.current) return;
            interruptRecognitionRef.current = null;

            // Restart if agent is still speaking
            const isStillSpeaking = audioRef.current || ('speechSynthesis' in window && window.speechSynthesis.speaking);
            if (callActiveRef.current && isStillSpeaking) {
                setTimeout(() => {
                    if (generationIdRef.current === myGenId && callActiveRef.current) {
                        startInterruptionListenerRef.current();
                    }
                }, 100);
            }
        };

        try {
            recognition.start();
            interruptRecognitionRef.current = recognition;
        } catch {
            // Best-effort — ignore
        }
    };

    // ── startListening — begin speech recognition ──
    startListeningRef.current = () => {
        if (!callActiveRef.current || isMutedRef.current) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setErrorMessage('Speech recognition is not supported in this browser. Try Chrome or Edge.');
            setCallState('error');
            return;
        }

        // Kill any existing instances to avoid conflicts
        killRecognition(recognitionRef);
        stopInterruptionListenerRef.current();

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        const myGenId = generationIdRef.current;
        let finalTranscript = '';
        let hasBeenProcessed = false;

        recognition.onresult = (event: any) => {
            if (generationIdRef.current !== myGenId || !callActiveRef.current || hasBeenProcessed) return;

            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript + ' ';
                } else {
                    interim += result[0].transcript;
                }
            }
            setTranscript(finalTranscript + interim);

            // Reset silence timer on any speech activity
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }

            // After 900ms of silence following finalized speech, process the input
            if (finalTranscript.trim()) {
                silenceTimerRef.current = setTimeout(() => {
                    if (hasBeenProcessed || generationIdRef.current !== myGenId) return;
                    hasBeenProcessed = true;
                    killRecognition(recognitionRef);
                    processUserInputRef.current(finalTranscript.trim());
                }, 900); // Faster: 900ms instead of 1200ms
            }
        };

        recognition.onerror = (event: any) => {
            if (generationIdRef.current !== myGenId || !callActiveRef.current) return;

            if (event.error === 'no-speech' || event.error === 'aborted') {
                // Normal — restart listening
                recognitionRef.current = null;
                if (callActiveRef.current && !hasBeenProcessed) {
                    setTimeout(() => {
                        if (generationIdRef.current === myGenId && callActiveRef.current) {
                            startListeningRef.current();
                        }
                    }, 300);
                }
                return;
            }
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                setErrorMessage('Microphone access denied. Please allow microphone access and try again.');
                setCallState('error');
            }
        };

        recognition.onend = () => {
            if (generationIdRef.current !== myGenId || !callActiveRef.current) return;
            recognitionRef.current = null;

            // CRITICAL FIX: Always restart if call is active and we haven't processed yet.
            // The old code only restarted if !finalTranscript.trim(), causing the mic to die
            // after the first exchange.
            if (callActiveRef.current && !hasBeenProcessed) {
                setTimeout(() => {
                    if (generationIdRef.current === myGenId && callActiveRef.current) {
                        startListeningRef.current();
                    }
                }, 200);
            }
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
            setCallState('listening');
        } catch {
            setTimeout(() => {
                if (callActiveRef.current && generationIdRef.current === myGenId) {
                    startListeningRef.current();
                }
            }, 500);
        }
    };

    // ── pickMaleVoice — select the best deep male English voice from the browser ──
    const pickMaleVoice = (): SpeechSynthesisVoice | null => {
        const voices = window.speechSynthesis.getVoices();
        const malePrefNames = [
            'Google UK English Male', 'Daniel', 'James', 'Thomas',
            'Google US English', 'Microsoft David', 'Microsoft Mark', 'Fred', 'Alex',
        ];
        for (const name of malePrefNames) {
            const v = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
            if (v) return v;
        }
        const male = voices.find(v => v.name.includes('Male') && v.lang.startsWith('en'));
        if (male) return male;
        return voices.find(v => v.lang.startsWith('en')) || null;
    };

    // ── speakWithBrowserTTS — clean fallback with best male voice ──
    const speakWithBrowserTTS = (text: string, genId: number) => {
        if (!('speechSynthesis' in window)) {
            if (callActiveRef.current) {
                setCallState('listening');
                startListeningRef.current();
            }
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.slice(0, 3000));
        utterance.rate = 1.08;
        utterance.pitch = 0.82;
        utterance.volume = 1.0;

        const voice = pickMaleVoice();
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
            if (generationIdRef.current !== genId) return;
            stopInterruptionListenerRef.current();
            if (callActiveRef.current && !wasInterruptedRef.current) {
                setCallState('listening');
                startListeningRef.current();
            }
        };
        utterance.onerror = () => {
            if (generationIdRef.current !== genId) return;
            stopInterruptionListenerRef.current();
            if (callActiveRef.current) {
                setCallState('listening');
                startListeningRef.current();
            }
        };

        wasInterruptedRef.current = false;
        window.speechSynthesis.speak(utterance);
        startInterruptionListenerRef.current();
    };

    // ── speakResponse — play TTS audio then resume listening ──
    speakResponseRef.current = async (text: string) => {
        if (!audioEnabledRef.current) {
            if (callActiveRef.current) {
                setCallState('listening');
                startListeningRef.current();
            }
            return;
        }

        const myGenId = generationIdRef.current;
        setCallState('speaking');
        wasInterruptedRef.current = false;

        // Start interruption listener IMMEDIATELY (don't wait for audio.play())
        startInterruptionListenerRef.current();

        try {
            const token = accessTokenRef.current;
            const res = await fetch('/api/voice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                // Use non-streaming (quality model) — the old code sent streaming:true
                // but then called res.blob() which defeats the purpose. Non-streaming
                // is simpler, more reliable, and uses the better quality model.
                body: JSON.stringify({ text }),
            });

            // Stale check — user may have interrupted or ended call during fetch
            if (generationIdRef.current !== myGenId || !callActiveRef.current) return;

            if (!res.ok) {
                console.warn('ElevenLabs TTS failed, using browser fallback');
                speakWithBrowserTTS(text, myGenId);
                return;
            }

            const blob = await res.blob();

            // Stale check again — blob download may take time
            if (generationIdRef.current !== myGenId || !callActiveRef.current) return;

            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => {
                audioRef.current = null;
                URL.revokeObjectURL(url);
                stopInterruptionListenerRef.current();

                // Only resume listening if this wasn't interrupted and generation is still current
                if (generationIdRef.current === myGenId && callActiveRef.current && !wasInterruptedRef.current) {
                    setCallState('listening');
                    startListeningRef.current();
                }
            };

            audio.onerror = () => {
                audioRef.current = null;
                URL.revokeObjectURL(url);
                if (generationIdRef.current === myGenId && callActiveRef.current) {
                    console.warn('ElevenLabs audio playback failed, using browser fallback');
                    speakWithBrowserTTS(text, myGenId);
                }
            };

            // Check one more time before playing
            if (generationIdRef.current !== myGenId || !callActiveRef.current || wasInterruptedRef.current) {
                URL.revokeObjectURL(url);
                return;
            }

            await audio.play();
        } catch (err) {
            if (generationIdRef.current !== myGenId || !callActiveRef.current) return;
            console.warn('Speech playback error, falling back to browser TTS:', err);
            speakWithBrowserTTS(text, myGenId);
        }
    };

    // ── processUserInput — send to agent then speak response ──
    processUserInputRef.current = async (text: string) => {
        if (!text.trim()) {
            if (callActiveRef.current) startListeningRef.current();
            return;
        }

        // New generation — invalidate any stale callbacks
        generationIdRef.current += 1;
        const myGenId = generationIdRef.current;

        setCallState('processing');
        setTranscript('');
        setConversationLog(prev => [...prev, { role: 'user', text }]);

        try {
            // Create an abort controller so we can cancel if user interrupts
            const abortController = new AbortController();
            agentAbortRef.current = abortController;

            const agentResponse = await onSendMessageRef.current(text);

            // Stale check
            if (generationIdRef.current !== myGenId || !callActiveRef.current) return;

            agentAbortRef.current = null;
            setConversationLog(prev => [...prev, { role: 'agent', text: agentResponse }]);
            await speakResponseRef.current(agentResponse);
        } catch (err: any) {
            if (generationIdRef.current !== myGenId || !callActiveRef.current) return;
            agentAbortRef.current = null;

            console.error('Agent processing error:', err);
            const errorText = 'Sorry, I had trouble processing that. Could you say it again?';
            setConversationLog(prev => [...prev, { role: 'agent', text: errorText }]);
            await speakResponseRef.current(errorText);
        }
    };

    // ── Stable callbacks for UI ──

    const startCall = useCallback(() => {
        callActiveRef.current = true;
        generationIdRef.current = 0;
        wasInterruptedRef.current = false;
        setCallState('connecting');
        setConversationLog([]);
        setTranscript('');
        setErrorMessage('');

        setTimeout(() => {
            if (!callActiveRef.current) return;
            const greeting = "V-Prai here, your publicist is on the line. So tell me — what are we making happen today?";
            setConversationLog([{ role: 'agent', text: greeting }]);
            speakResponseRef.current(greeting);
        }, 600);
    }, []);

    const stopCall = useCallback(() => {
        stopCallRef.current();
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const next = !prev;
            if (next && recognitionRef.current) {
                killRecognition(recognitionRef);
            } else if (!next && callActiveRef.current) {
                startListeningRef.current();
            }
            return next;
        });
    }, []);

    // Clean up when modal closes
    useEffect(() => {
        if (!isOpen) {
            stopCallRef.current();
        }
    }, [isOpen]);

    // Clean up on unmount
    useEffect(() => {
        return () => { stopCallRef.current(); };
    }, []);

    if (!isOpen) return null;

    const isActive = callState !== 'idle' && callState !== 'error';
    const statusText = {
        idle: 'Ready to call',
        connecting: 'Connecting...',
        listening: 'Listening...',
        processing: 'Thinking...',
        speaking: 'V-Prai is speaking... (speak to interrupt)',
        error: errorMessage || 'Call error',
    }[callState];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                onClick={isActive ? undefined : () => { stopCall(); onClose(); }}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                {/* Close button */}
                <button
                    onClick={() => { stopCall(); onClose(); }}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="px-6 pt-6 pb-4 text-center">
                    <h3 className="text-lg font-semibold text-white">Voice Call</h3>
                    <p className="text-xs text-white/40 mt-1">Talk to V-Prai hands-free</p>
                </div>

                {/* Orb + Status */}
                <div className="flex flex-col items-center py-6">
                    <div className={`relative ${callState === 'speaking' ? 'scale-110' : callState === 'listening' ? 'scale-105' : 'scale-100'} transition-transform duration-500`}>
                        <VisioOrb active={isActive} size="md" />
                        {callState === 'listening' && !isMuted && (
                            <div className="absolute inset-0 rounded-full border-2 border-visio-teal/50 animate-ping" />
                        )}
                    </div>

                    {/* Status */}
                    <div className="mt-4 flex items-center gap-2">
                        {(callState === 'connecting' || callState === 'processing') && (
                            <Loader2 size={14} className="animate-spin text-visio-teal" />
                        )}
                        {callState === 'listening' && !isMuted && (
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                        <span className={`text-sm font-medium ${
                            callState === 'error' ? 'text-red-400' :
                            callState === 'listening' ? 'text-visio-teal' :
                            'text-white/60'
                        }`}>
                            {statusText}
                        </span>
                    </div>

                    {/* Live Transcript */}
                    {transcript && callState === 'listening' && (
                        <div className="mt-3 px-6 w-full">
                            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 italic max-h-20 overflow-y-auto">
                                &ldquo;{transcript}&rdquo;
                            </div>
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
                        disabled={!isActive}
                        className={`p-4 rounded-full transition-all duration-200 ${
                            !isActive
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
                            onClick={stopCall}
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

                {/* Browser support note */}
                <div className="px-6 pb-4 text-center">
                    <p className="text-[10px] text-white/20">
                        Works best in Chrome or Edge. Speak naturally — V-Prai will respond after a brief pause. You can interrupt at any time.
                    </p>
                </div>
            </div>
        </div>
    );
};
