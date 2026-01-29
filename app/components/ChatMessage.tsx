import React, { useMemo, useState, useEffect } from 'react';
import { Message, Role, Lead } from '../types';
import { LeadCard } from './LeadCard';
import { VisioOrb } from './VisioOrb';
import { Bot, User, Brain, Search, Target, Sparkles, BarChart3 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface ChatMessageProps {
    message: Message;
    onSaveLead?: (lead: Lead) => void;
}

// Reasoning steps for different tiers
const REASONING_STEPS = {
    instant: [
        { icon: Search, text: 'Searching...' }
    ],
    business: [
        { icon: Brain, text: 'Analyzing your request...' },
        { icon: BarChart3, text: 'Cross-referencing artist profile...' },
        { icon: Target, text: 'Identifying optimal targets...' },
        { icon: Sparkles, text: 'Generating recommendations...' }
    ],
    enterprise: [
        { icon: Brain, text: 'Deep analysis in progress...' },
        { icon: BarChart3, text: 'Cross-referencing artist metrics...' },
        { icon: Search, text: 'Scanning industry databases...' },
        { icon: Target, text: 'Matching with verified contacts...' },
        { icon: Sparkles, text: 'Crafting personalized strategy...' }
    ]
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSaveLead }) => {
    const isUser = message.role === Role.USER;
    const [reasoningStep, setReasoningStep] = useState(0);

    const tier = (message as any).tier || 'instant';
    const steps = REASONING_STEPS[tier as keyof typeof REASONING_STEPS] || REASONING_STEPS.instant;

    // Cycle through reasoning steps when thinking
    useEffect(() => {
        if (!message.isThinking) {
            setReasoningStep(0);
            return;
        }

        const interval = setInterval(() => {
            setReasoningStep(prev => (prev + 1) % steps.length);
        }, tier === 'instant' ? 800 : 1200);

        return () => clearInterval(interval);
    }, [message.isThinking, tier, steps.length]);

    // Memoize parsing logic to extract JSON blocks from the content
    const parsedContent = useMemo(() => {
        if (isUser) return { text: message.content, leads: [] };

        // Try multiple regex patterns to catch JSON blocks or inline JSON
        const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
        const match = message.content.match(jsonBlockRegex);

        if (match && match[1]) {
            try {
                const leads: Lead[] = JSON.parse(match[1]);
                const textParts = message.content.replace(jsonBlockRegex, '').trim();
                return { text: textParts, leads };
            } catch (e) {
                console.error("Failed to parse leads JSON", e);
                return { text: message.content, leads: [] };
            }
        }

        // Also check for 'leads' property if passed directly (from our backend response structure)
        if (message.leads && message.leads.length > 0) {
            return { text: message.content, leads: message.leads };
        }

        return { text: message.content, leads: [] };
    }, [message.content, isUser, message.leads]);

    const currentStep = steps[reasoningStep];
    const ReasoningIcon = currentStep?.icon || Search;

    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex max-w-3xl gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${isUser
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-visio-teal/20 border-visio-teal/30 text-visio-teal'
                    }`}>
                    {isUser ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Content */}
                <div className="flex flex-col gap-2 min-w-0 w-full">
                    {/* Header for Bot */}
                    {!isUser && (
                        <span className="text-xs font-medium text-visio-teal/80 mb-1">Visio AI</span>
                    )}

                    {/* Bubble or Orb for Thinking State */}
                    {message.isThinking ? (
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl rounded-tl-none w-full max-w-md flex flex-col gap-4 shadow-lg backdrop-blur-md">

                            {/* Top: Orb + Current Step */}
                            <div className="flex items-start gap-4">
                                <div className="shrink-0 pt-1">
                                    <VisioOrb active={true} size="sm" />
                                </div>
                                <div className="space-y-3 w-full">
                                    <Skeleton className="h-3 w-3/4 bg-white/10 rounded-full" />
                                    <Skeleton className="h-3 w-full bg-white/5 rounded-full" />
                                    <Skeleton className="h-3 w-5/6 bg-white/5 rounded-full" />
                                </div>
                            </div>

                            {/* Reasoning Steps (for Business/Enterprise) */}
                            {tier !== 'instant' && (
                                <div className="border-t border-white/5 pt-4 space-y-2">
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Reasoning</p>
                                    <div className="space-y-1.5">
                                        {steps.map((step, idx) => {
                                            const StepIcon = step.icon;
                                            const isActive = idx === reasoningStep;
                                            const isComplete = idx < reasoningStep;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center gap-2 text-xs transition-all duration-300 ${isActive ? 'text-visio-accent' : isComplete ? 'text-white/40' : 'text-white/20'
                                                        }`}
                                                >
                                                    <StepIcon size={12} className={isActive ? 'animate-pulse' : ''} />
                                                    <span className={isActive ? 'font-medium' : ''}>{step.text}</span>
                                                    {isComplete && <span className="ml-auto text-green-400">✓</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Current Action Indicator */}
                            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                <div className="w-1.5 h-1.5 rounded-full bg-visio-accent animate-pulse" />
                                <ReasoningIcon size={12} className="text-visio-teal/80 animate-pulse" />
                                <span className="text-[10px] text-visio-teal/80 font-medium tracking-wide animate-pulse">
                                    {currentStep?.text || 'Processing...'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={`px-5 py-3 rounded-2xl backdrop-blur-sm text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${isUser
                                ? 'bg-white text-black rounded-tr-none'
                                : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-none'
                                }`}>
                                {parsedContent.text}
                            </div>

                            {/* Render Leads if they exist */}
                            {!isUser && parsedContent.leads.length > 0 && (
                                <div className="mt-2 w-full">
                                    {parsedContent.leads.map((lead) => (
                                        <div key={lead.id} className="flex justify-center">
                                            <LeadCard lead={lead} onSave={onSaveLead} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Timestamp */}
                    <span className={`text-[10px] text-white/30 ${isUser ? 'text-right' : 'text-left'} mt-1`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

            </div>
        </div>
    );
};
