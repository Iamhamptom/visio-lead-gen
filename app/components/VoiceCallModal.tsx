'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X, Loader2 } from 'lucide-react';
import { VisioOrb } from './VisioOrb';

interface VoiceCallModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSendMessage: (text: string) => Promise<string>;
    accessToken?: string;
}

type CallState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

// Browser speech recognition types
interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
    error: string;
    message?: string;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
    isOpen,
    onClose,
    onSendMessage,
    accessToken,
}) => {
    const [callState, setCallState] = useState<CallState>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [conversationLog, setConversationLog] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [audioEnabled, setAudioEnabled] = useState(true);

    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isListeningRef = useRef(false);
    const callActiveRef = useRef(false);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Scroll conversation log to bottom
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [conversationLog]);

    // Clean up on close
    useEffect(() => {
        if (!isOpen) {
            stopCall();
        }
    }, [isOpen]);

    const getSpeechRecognition = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setErrorMessage('Speech recognition is not supported in this browser. Try Chrome or Edge.');
            setCallState('error');
            return null;
        }
        return new SpeechRecognition();
    }, []);

    const speakResponse = useCallback(async (text: string) => {
        if (!audioEnabled) return;

        try {
            setCallState('speaking');

            const res = await fetch('/api/voice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({ text }),
            });

            if (!res.ok) {
                console.error('TTS failed, falling back to browser speech');
                // Fallback to browser TTS
                if ('speechSynthesis' in window) {
                    const utterance = createFallbackUtterance(text);
                    utterance.rate = 1.0;
                    utterance.pitch = 0.9;
                    utterance.onend = () => {
                        if (callActiveRef.current) {
                            startListening();
                        }
                    };
                    window.speechSynthesis.speak(utterance);
                }
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => {
                audioRef.current = null;
                URL.revokeObjectURL(url);
                // Resume listening after speaking
                if (callActiveRef.current) {
                    startListening();
                }
            };

            audio.onerror = () => {
                audioRef.current = null;
                URL.revokeObjectURL(url);
                if (callActiveRef.current) {
                    startListening();
                }
            };

            await audio.play();
        } catch (err) {
            console.error('Speech playback error:', err);
            // Resume listening even on error
            if (callActiveRef.current) {
                startListening();
            }
        }
    }, [accessToken, audioEnabled]);

    const processUserInput = useCallback(async (text: string) => {
        if (!text.trim()) {
            if (callActiveRef.current) startListening();
            return;
        }

        setCallState('processing');
        setTranscript('');
        setConversationLog(prev => [...prev, { role: 'user', text }]);

        try {
            const agentResponse = await onSendMessage(text);
            setResponse(agentResponse);
            setConversationLog(prev => [...prev, { role: 'agent', text: agentResponse }]);

            // Speak the response
            await speakResponse(agentResponse);
        } catch (err: any) {
            console.error('Agent processing error:', err);
            const errorText = 'Sorry, I had trouble processing that. Could you say it again?';
            setResponse(errorText);
            setConversationLog(prev => [...prev, { role: 'agent', text: errorText }]);
            if (callActiveRef.current) {
                startListening();
            }
        }
    }, [onSendMessage, speakResponse]);

    const startListening = useCallback(() => {
        if (!callActiveRef.current || isMuted) return;

        const recognition = getSpeechRecognition();
        if (!recognition) return;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = '';
        let hasResults = false;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            hasResults = true;
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

            // Reset silence timer on any speech
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }

            // After 2 seconds of silence following speech, process the input
            if (finalTranscript.trim()) {
                silenceTimerRef.current = setTimeout(() => {
                    recognition.stop();
                    isListeningRef.current = false;
                    processUserInput(finalTranscript.trim());
                }, 2000);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            if (event.error === 'no-speech' || event.error === 'aborted') {
                // These are normal — restart listening
                if (callActiveRef.current) {
                    setTimeout(() => startListening(), 500);
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
            isListeningRef.current = false;
            // If we have no results and call is still active, restart
            if (callActiveRef.current && !hasResults && callState !== 'processing' && callState !== 'speaking') {
                setTimeout(() => startListening(), 300);
            }
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
            isListeningRef.current = true;
            setCallState('listening');
        } catch (err) {
            console.error('Failed to start recognition:', err);
            // Might already be running, try restarting
            setTimeout(() => {
                if (callActiveRef.current) startListening();
            }, 500);
        }
    }, [getSpeechRecognition, isMuted, processUserInput, callState]);

    const startCall = useCallback(() => {
        callActiveRef.current = true;
        setCallState('connecting');
        setConversationLog([]);
        setResponse('');
        setTranscript('');
        setErrorMessage('');

        // Simulate brief connection delay
        setTimeout(() => {
            if (!callActiveRef.current) return;

            const greeting = "Hey! V-Prai here. I'm listening — what are you working on?";
            setResponse(greeting);
            setConversationLog([{ role: 'agent', text: greeting }]);
            speakResponse(greeting);
        }, 800);
    }, [speakResponse]);

    const stopCall = useCallback(() => {
        callActiveRef.current = false;
        isListeningRef.current = false;

        // Stop speech recognition
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {}
            recognitionRef.current = null;
        }

        // Stop audio playback
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        // Clear silence timer
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        // Stop browser TTS if active
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        setCallState('idle');
        setTranscript('');
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const next = !prev;
            if (next && recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch {}
                isListeningRef.current = false;
            } else if (!next && callActiveRef.current && callState === 'listening') {
                startListening();
            }
            return next;
        });
    }, [callState, startListening]);

    if (!isOpen) return null;

    const isActive = callState !== 'idle' && callState !== 'error';
    const statusText = {
        idle: 'Ready to call',
        connecting: 'Connecting...',
        listening: 'Listening...',
        processing: 'Thinking...',
        speaking: 'V-Prai is speaking...',
        error: errorMessage || 'Call error',
    }[callState];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                onClick={isActive ? undefined : onClose}
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
                        {/* Listening indicator ring */}
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
                                "{transcript}"
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
                        onClick={() => setAudioEnabled(!audioEnabled)}
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
                        Works best in Chrome or Edge. Speak naturally — V-Prai will respond after a brief pause.
                    </p>
                </div>
            </div>
        </div>
    );
};

// Fallback: create a SpeechSynthesisUtterance for when ElevenLabs is unavailable
function createFallbackUtterance(text: string): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    return utterance;
}
