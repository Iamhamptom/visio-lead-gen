import React, { useMemo, useState, useEffect } from 'react';
import { Message, Role, Lead, WebResult } from '../types';
import { LeadCard } from './LeadCard';
import { VisioOrb } from './VisioOrb';
import { Bot, User, Brain, Search, Target, Sparkles, BarChart3 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
    const mode = message.mode || 'chat'; // Get mode (default to chat if missing)

    // Override steps for Chat Mode
    const steps = useMemo(() => {
        if (mode === 'chat') {
            return [
                { icon: Brain, text: 'Thinking...' },
                { icon: Sparkles, text: 'Typing...' }
            ];
        }
        return REASONING_STEPS[tier as keyof typeof REASONING_STEPS] || REASONING_STEPS.instant;
    }, [tier, mode]);

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
        if (isUser) return { text: message.content, leads: [], webResults: [] as WebResult[] };

        // Try multiple regex patterns to catch JSON blocks or inline JSON
        const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
        const match = message.content.match(jsonBlockRegex);

        if (match && match[1]) {
            try {
                const leads: Lead[] = JSON.parse(match[1]);
                const textParts = message.content.replace(jsonBlockRegex, '').trim();
                return { text: textParts, leads, webResults: message.webResults || [] };
            } catch (e) {
                console.error("Failed to parse leads JSON", e);
                return { text: message.content, leads: [], webResults: message.webResults || [] };
            }
        }

        // Also check for 'leads' property if passed directly (from our backend response structure)
        if (message.leads && message.leads.length > 0) {
            return { text: message.content, leads: message.leads, webResults: message.webResults || [] };
        }

        return { text: message.content, leads: [], webResults: message.webResults || [] };
    }, [message.content, isUser, message.leads, message.webResults]);

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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-medium text-visio-teal/80">V-Prai</span>
                            {message.webResults && message.webResults.length > 0 && (
                                <span className="text-[10px] uppercase tracking-widest text-visio-teal/70 border border-visio-teal/30 bg-visio-teal/10 px-2 py-0.5 rounded-full">
                                    Web Search Used
                                </span>
                            )}
                            {message.toolUsed && message.toolUsed !== 'web_search' && (
                                <span className="text-[10px] uppercase tracking-widest text-white/60 border border-white/10 bg-white/5 px-2 py-0.5 rounded-full">
                                    Tool: {message.toolUsed.replace(/_/g, ' ')}
                                </span>
                            )}
                        </div>
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
                            <div className={`px-5 py-3 rounded-2xl backdrop-blur-sm text-sm leading-relaxed shadow-sm !select-text cursor-text relative z-10 ${isUser
                                ? 'bg-white text-black rounded-tr-none'
                                : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-none'
                                }`}>
                                {isUser ? (
                                    <div className="whitespace-pre-wrap">{parsedContent.text}</div>
                                ) : (
                                    <div className="markdown-content !select-text">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ node, ...props }) => <p className="mb-4 last:mb-0 text-white/90 leading-relaxed text-[15px]" {...props} />,

                                                // Lists
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2 text-white/90" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-white/90" {...props} />,
                                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,

                                                // Headings (Distinct styles for visual hierarchy)
                                                h1: ({ node, ...props }) => <h1 className="mb-3 mt-4 text-lg font-bold text-white leading-tight" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="mb-2 mt-4 text-base font-bold text-white/95 leading-snug" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="mb-2 mt-2 text-sm font-bold text-white/90 leading-snug uppercase tracking-wide" {...props} />,

                                                // Formatting
                                                strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                                                em: ({ node, ...props }) => <em className="text-visio-accent not-italic" {...props} />,

                                                // Code
                                                code: ({ node, ...props }) => {
                                                    const { className, children } = props as any;
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return match ? (
                                                        <code className="block bg-black/50 border border-white/10 p-4 rounded-xl my-4 font-mono text-sm overflow-x-auto text-visio-teal" {...props} />
                                                    ) : (
                                                        <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs text-visio-accent" {...props} />
                                                    );
                                                },

                                                // Quotes
                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-visio-teal/50 pl-4 py-1 italic my-4 text-white/60 bg-white/5 rounded-r-lg" {...props} />,

                                                // Tables
                                                table: ({ node, ...props }) => <div className="overflow-x-auto my-4 rounded-lg border border-white/10"><table className="min-w-full divide-y divide-white/10 bg-black/20" {...props} /></div>,
                                                th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider bg-white/10" {...props} />,
                                                td: ({ node, ...props }) => <td className="px-4 py-3 whitespace-nowrap text-sm text-white/80 border-t border-white/5" {...props} />,
                                                a: ({ node, ...props }) => <a className="text-visio-teal hover:text-white underline underline-offset-4 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                                            }}
                                        >
                                            {parsedContent.text}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>

                            {/* Render Leads if they exist */}
                            {!isUser && parsedContent.leads.length > 0 && (
                                <div className="mt-2 w-full">
                                    {parsedContent.leads.map((lead) => (
                                        <div key={lead.id} className="flex justify-center">
                                            <LeadCard lead={lead} onSave={onSaveLead} />
                                        </div>
                                    ))}
                                    {parsedContent.leads.length > 1 && onSaveLead && (
                                        <div className="flex justify-center mt-3">
                                            <button
                                                onClick={() => parsedContent.leads.forEach(lead => onSaveLead(lead))}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-visio-teal/10 border border-visio-teal/20 text-visio-teal text-xs font-medium hover:bg-visio-teal/20 transition-colors"
                                            >
                                                Save All {parsedContent.leads.length} Leads
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isUser && parsedContent.webResults.length > 0 && (
                                <div className="mt-3 w-full space-y-2">
                                    <div className="text-[10px] uppercase tracking-widest text-white/40">Sources</div>
                                    {parsedContent.webResults.slice(0, 6).map((result, index) => (
                                        <a
                                            key={`${result.url}-${index}`}
                                            href={result.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/80 hover:border-visio-teal/50 hover:text-white transition-colors"
                                        >
                                            <div className="font-semibold text-white/90">{result.title}</div>
                                            {result.snippet && (
                                                <div className="mt-1 text-white/60 max-h-14 overflow-hidden">{result.snippet}</div>
                                            )}
                                            <div className="mt-2 text-[10px] text-visio-teal/70">{result.source || 'Web'}</div>
                                        </a>
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

            </div >
        </div >
    );
};
