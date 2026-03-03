import React, { useMemo, useState, useEffect } from 'react';
import { Message, Role, Lead, WebResult } from '../types';
import { VisioOrb } from './VisioOrb';
import { Bot, User, Brain, Search, Target, Sparkles, BarChart3, Download, ChevronDown, ChevronUp, Loader2, Globe, Wrench, CheckCircle2, Star } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateLeadListCSV, downloadCSV } from '@/lib/csv-export';
import { VoiceButton } from './VoiceButton';

interface ChatMessageProps {
    message: Message;
    onSaveLead?: (lead: Lead) => void;
    onLoadMore?: (messageId: string, query: string, offset: number) => void;
    accessToken?: string;
    sessionId?: string;
    previousUserMessage?: string;
}

// ─── Feedback Stars ──────────────────────────────────
const FeedbackStars: React.FC<{
    messageId: string;
    sessionId?: string;
    aiResponseSnippet: string;
    queryContext?: string;
    accessToken?: string;
}> = ({ messageId, sessionId, aiResponseSnippet, queryContext, accessToken }) => {
    const [visible, setVisible] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    // Show after 2s delay
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 2000);
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    if (submitted) {
        return (
            <span className="text-[10px] text-white/30 mt-2 inline-block animate-in fade-in duration-300">
                Thanks for the feedback!
            </span>
        );
    }

    const handleRate = async (stars: number) => {
        setRating(stars);
        setSubmitted(true);

        try {
            await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({
                    rating: stars,
                    sessionId,
                    messageId,
                    aiResponseSnippet: aiResponseSnippet.slice(0, 500),
                    queryContext,
                }),
            });
        } catch {
            // Best effort — don't disrupt UI
        }
    };

    return (
        <div className="flex items-center gap-1 mt-2 animate-in fade-in duration-500">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    onClick={() => handleRate(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="p-0.5 transition-all duration-150 hover:scale-110"
                    aria-label={`Rate ${star} stars`}
                >
                    <Star
                        size={14}
                        className={`transition-colors duration-150 ${
                            star <= (hoveredStar || rating)
                                ? 'text-visio-teal fill-visio-teal'
                                : 'text-white/15 hover:text-white/30'
                        }`}
                    />
                </button>
            ))}
        </div>
    );
};

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

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSaveLead, onLoadMore, accessToken, sessionId, previousUserMessage }) => {
    const isUser = message.role === Role.USER;
    const [reasoningStep, setReasoningStep] = useState(0);
    const [showAllLeads, setShowAllLeads] = useState(false);

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

    // Handle CSV download
    const handleDownloadCSV = () => {
        const csv = generateLeadListCSV({
            id: message.id,
            sessionId: '',
            title: 'Lead Export',
            brief: null,
            leads: parsedContent.leads,
            createdAt: message.timestamp,
        });
        downloadCSV(csv, `visio-leads-${new Date().toISOString().split('T')[0]}.csv`);
    };

    const displayedLeads = showAllLeads ? parsedContent.leads : parsedContent.leads.slice(0, 10);

    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-10 group animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <div className={`flex max-w-[90%] sm:max-w-4xl gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} w-full`}>

                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 mt-1 rounded-full flex items-center justify-center border shadow-lg transition-transform duration-300 group-hover:scale-105 ${isUser
                    ? 'bg-gradient-to-br from-gray-100 to-gray-300 border-white/50 text-gray-700'
                    : 'bg-gradient-to-br from-visio-teal/20 to-visio-teal/5 border-visio-teal/30 text-visio-teal shadow-[0_0_15px_rgba(20,184,166,0.15)]'
                    }`}>
                    {isUser ? <User size={18} /> : <Bot size={18} />}
                </div>

                {/* Content */}
                <div className="flex flex-col min-w-0 w-full">
                    {/* Header for Bot */}
                    {!isUser && (
                        <div className="flex flex-wrap items-center gap-3 mb-2 px-1">
                            <span className="text-sm font-semibold tracking-wide text-visio-teal">V-Prai</span>
                            
                            <div className="flex items-center gap-2">
                                {!message.isThinking && !message.isResearching && parsedContent.text.length > 10 && (
                                    <VoiceButton text={parsedContent.text} accessToken={accessToken} />
                                )}
                                {message.webResults && message.webResults.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-visio-teal/90 border border-visio-teal/30 bg-visio-teal/10 px-2.5 py-1 rounded-full shadow-sm">
                                        <Globe size={10} />
                                        Web Search Used
                                    </div>
                                )}
                                {message.toolUsed && message.toolUsed !== 'web_search' && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70 border border-white/20 bg-white/10 px-2.5 py-1 rounded-full shadow-sm">
                                        <Wrench size={10} />
                                        {message.toolUsed.replace(/_/g, ' ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Research In Progress State */}
                    {message.isResearching ? (
                        <div className="p-6 bg-gradient-to-b from-white/10 to-transparent border border-white/10 rounded-2xl rounded-tl-sm w-full max-w-xl shadow-2xl backdrop-blur-xl">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="relative flex items-center justify-center w-5 h-5">
                                    <div className="absolute inset-0 rounded-full bg-green-500/30 animate-ping" />
                                    <div className="relative w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
                                </div>
                                <span className="text-sm text-green-400 font-semibold tracking-wide">Deep Researching...</span>
                                <Loader2 size={16} className="animate-spin text-green-500/50 ml-auto" />
                            </div>
                            <div className="prose prose-invert max-w-none prose-sm">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ node, ...props }) => <p className="mb-3 last:mb-0 text-white/80 leading-relaxed text-[15px]" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="mb-2 mt-4 text-base font-semibold text-white/95" {...props} />,
                                    }}
                                >
                                    {parsedContent.text}
                                </ReactMarkdown>
                            </div>
                        </div>

                    ) : message.isThinking ? (
                        <div className="p-7 bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl rounded-tl-sm w-full max-w-lg shadow-2xl backdrop-blur-xl flex flex-col gap-6">
                            {/* Top: Orb + Skeletons */}
                            <div className="flex items-start gap-5">
                                <div className="shrink-0 pt-0.5">
                                    <VisioOrb active={true} size="sm" />
                                </div>
                                <div className="space-y-3.5 w-full pt-1">
                                    <Skeleton className="h-2.5 w-3/4 bg-white/10 rounded-full" />
                                    <Skeleton className="h-2.5 w-full bg-white/5 rounded-full" />
                                    <Skeleton className="h-2.5 w-5/6 bg-white/5 rounded-full" />
                                </div>
                            </div>

                            {/* Reasoning Steps (for Business/Enterprise) */}
                            {tier !== 'instant' && (
                                <div className="border-t border-white/10 pt-5">
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-4">Reasoning Process</p>
                                    <div className="space-y-3.5">
                                        {steps.map((step, idx) => {
                                            const StepIcon = step.icon;
                                            const isActive = idx === reasoningStep;
                                            const isComplete = idx < reasoningStep;
                                            return (
                                                <div key={idx} className={`flex items-center gap-3.5 text-sm transition-all duration-500 ${isActive ? 'text-visio-teal opacity-100 translate-x-1' : isComplete ? 'text-white/50' : 'text-white/20'}`}>
                                                    <div className={`flex items-center justify-center w-6 h-6 rounded-full border transition-colors duration-300 ${isActive ? 'border-visio-teal bg-visio-teal/10' : isComplete ? 'border-white/20 bg-white/5' : 'border-white/10'}`}>
                                                        {isComplete ? <CheckCircle2 size={12} className="text-visio-teal" /> : <StepIcon size={12} className={isActive ? 'animate-pulse' : ''} />}
                                                    </div>
                                                    <span className={isActive ? 'font-medium' : ''}>{step.text}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Current Action Indicator */}
                            <div className="flex items-center gap-2.5 pt-4 border-t border-white/10 mt-1">
                                <ReasoningIcon size={14} className="text-visio-teal animate-pulse" />
                                <span className="text-xs text-visio-teal font-medium tracking-wide animate-pulse">
                                    {currentStep?.text || 'Processing...'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={`relative z-10 !select-text cursor-text transition-all duration-300 ${isUser
                                ? 'bg-gradient-to-br from-white to-gray-100 text-black px-6 py-4 rounded-2xl rounded-tr-sm shadow-md'
                                : 'bg-[#0f1115]/90 border border-white/10 text-white/90 px-6 py-5 rounded-2xl rounded-tl-sm shadow-xl backdrop-blur-xl'
                                }`}>
                                {isUser ? (
                                    <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{parsedContent.text}</div>
                                ) : (
                                    <div className="markdown-content !select-text">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ node, ...props }) => <p className="mb-5 last:mb-0 leading-relaxed text-[15px] text-white/80" {...props} />,

                                                // Lists
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-5 space-y-2 text-white/80 marker:text-visio-teal/70" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-5 space-y-2 text-white/80 marker:text-visio-teal/70 marker:font-medium" {...props} />,
                                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,

                                                // Headings (Distinct styles for visual hierarchy)
                                                h1: ({ node, ...props }) => <h1 className="mb-4 mt-8 text-2xl font-bold text-white tracking-tight" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="mb-3 mt-8 text-lg font-semibold text-white/95 tracking-tight border-b border-white/10 pb-2" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="mb-2 mt-6 text-sm font-semibold text-visio-teal uppercase tracking-widest" {...props} />,

                                                // Formatting
                                                strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                                                em: ({ node, ...props }) => <em className="text-visio-accent not-italic font-medium" {...props} />,

                                                // Code
                                                code: ({ node, inline, className, children, ...props }: any) => {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline && match ? (
                                                        <div className="my-6 rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-lg">
                                                            <div className="flex items-center px-4 py-2.5 bg-white/5 border-b border-white/5">
                                                                <div className="flex gap-1.5">
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                                                                </div>
                                                                <span className="ml-4 text-[11px] font-mono text-white/40 uppercase tracking-wider">{match[1]}</span>
                                                            </div>
                                                            <div className="p-4 overflow-x-auto">
                                                                <code className="text-[13px] font-mono text-white/80 leading-relaxed" {...props}>{children}</code>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <code className="bg-white/10 px-1.5 py-0.5 rounded-md font-mono text-[13px] text-visio-teal border border-white/5" {...props}>{children}</code>
                                                    );
                                                },

                                                // Quotes
                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-visio-teal pl-5 py-2 my-6 italic text-white/60 bg-gradient-to-r from-visio-teal/10 to-transparent rounded-r-xl" {...props} />,

                                                // Tables
                                                table: ({ node, ...props }) => <div className="overflow-x-auto my-6 rounded-xl border border-white/10 bg-black/40 shadow-lg"><table className="min-w-full divide-y divide-white/10" {...props} /></div>,
                                                th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-[11px] font-semibold text-white/60 uppercase tracking-widest bg-white/5" {...props} />,
                                                td: ({ node, ...props }) => <td className="px-4 py-3 whitespace-nowrap text-[13px] text-white/80 border-t border-white/5" {...props} />,
                                                a: ({ node, ...props }) => <a className="text-visio-teal hover:text-white underline decoration-visio-teal/40 underline-offset-4 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                                            }}
                                        >
                                            {parsedContent.text}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>

                            {/* Render Leads as Interactive Table */}
                            {!isUser && parsedContent.leads.length > 0 && (
                                <div className="mt-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Header with count + download */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 px-1">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-visio-teal/10 border border-visio-teal/20">
                                                <Target size={16} className="text-visio-teal" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-white">Lead Results</h3>
                                                <span className="text-[11px] text-white/50">{parsedContent.leads.length} contacts successfully sourced</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleDownloadCSV}
                                                className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-xs font-medium hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                                            >
                                                <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                                                Export CSV
                                            </button>
                                            {onSaveLead && parsedContent.leads.length > 0 && (
                                                <button
                                                    onClick={() => parsedContent.leads.forEach(lead => onSaveLead(lead))}
                                                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-visio-teal text-black text-xs font-semibold hover:bg-visio-teal/90 shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-all duration-300"
                                                >
                                                    Save All
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inline Clickable Table */}
                                    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white/5 border-b border-white/10">
                                                    <th className="px-4 py-3.5 text-white/40 font-semibold text-[10px] uppercase tracking-widest whitespace-nowrap">#</th>
                                                    <th className="px-4 py-3.5 text-white/40 font-semibold text-[10px] uppercase tracking-widest whitespace-nowrap">Name</th>
                                                    <th className="px-4 py-3.5 text-white/40 font-semibold text-[10px] uppercase tracking-widest whitespace-nowrap">Title</th>
                                                    <th className="px-4 py-3.5 text-white/40 font-semibold text-[10px] uppercase tracking-widest whitespace-nowrap">Company</th>
                                                    <th className="px-4 py-3.5 text-white/40 font-semibold text-[10px] uppercase tracking-widest whitespace-nowrap">Contact</th>
                                                    <th className="px-4 py-3.5 text-white/40 font-semibold text-[10px] uppercase tracking-widest whitespace-nowrap">Reach</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {displayedLeads.map((lead, i) => (
                                                    <tr
                                                        key={lead.id || i}
                                                        className="group hover:bg-white/[0.04] transition-colors"
                                                    >
                                                        <td className="px-4 py-3.5 text-white/30 text-xs font-mono">{String(i + 1).padStart(2, '0')}</td>
                                                        <td className="px-4 py-3.5">
                                                            <div className="flex flex-col">
                                                                {lead.url ? (
                                                                    <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-white group-hover:text-visio-teal transition-colors">
                                                                        {lead.name}
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-[13px] font-medium text-white">{lead.name}</span>
                                                                )}
                                                                {lead.source && <span className="text-[10px] text-white/40 mt-0.5">{lead.source}</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-white/70 text-[13px]">{lead.title || '—'}</td>
                                                        <td className="px-4 py-3.5 text-white/70 text-[13px] font-medium">{lead.company || '—'}</td>
                                                        <td className="px-4 py-3.5">
                                                            {lead.email ? (
                                                                <a href={`mailto:${lead.email}`} className="text-[13px] text-visio-teal hover:underline decoration-visio-teal/50 underline-offset-4">
                                                                    {lead.email}
                                                                </a>
                                                            ) : <span className="text-white/30 text-[13px]">—</span>}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-white/50 text-[13px]">
                                                            {lead.followers ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <BarChart3 size={12} className="text-white/30" />
                                                                    {lead.followers}
                                                                </div>
                                                            ) : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Show More / Load More controls */}
                                    <div className="flex items-center justify-between mt-4 px-1">
                                        {parsedContent.leads.length > 10 && (
                                            <button
                                                onClick={() => setShowAllLeads(!showAllLeads)}
                                                className="flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white transition-colors"
                                            >
                                                {showAllLeads ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                {showAllLeads ? 'Show fewer results' : `View all ${parsedContent.leads.length} results`}
                                            </button>
                                        )}
                                        
                                        {message.canLoadMore && onLoadMore && (
                                            <button
                                                onClick={() => onLoadMore(message.id, message.leadSearchQuery || '', message.leadSearchOffset || 0)}
                                                className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-xs font-medium hover:bg-white/10 transition-colors ml-auto"
                                            >
                                                <Search size={14} className="text-white/50 group-hover:text-white transition-colors" />
                                                Find More Leads
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Web Results Rendering */}
                            {!isUser && parsedContent.webResults.length > 0 && (
                                <div className="mt-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <Globe size={14} className="text-visio-teal/70" />
                                        <h4 className="text-[11px] font-semibold uppercase tracking-widest text-white/50">Sources Referenced</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {parsedContent.webResults.slice(0, 6).map((result, index) => (
                                            <a
                                                key={`${result.url}-${index}`}
                                                href={result.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group flex flex-col p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-visio-teal/40 transition-all duration-300 h-full"
                                            >
                                                <div className="text-[13px] font-medium text-white/90 group-hover:text-visio-teal line-clamp-1 mb-1.5 transition-colors">{result.title}</div>
                                                {result.snippet && (
                                                    <div className="text-[11px] text-white/50 line-clamp-2 leading-relaxed mb-3 flex-grow">{result.snippet}</div>
                                                )}
                                                <div className="text-[10px] font-medium uppercase tracking-wider text-visio-teal/60 mt-auto flex items-center gap-1">
                                                    {result.source || 'Web Source'}
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Timestamp */}
                    <div className={`text-[10px] font-medium tracking-wide text-white/30 ${isUser ? 'text-right' : 'text-left'} mt-3 px-1`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {/* Feedback Stars — agent messages only, after content is rendered */}
                    {!isUser && !message.isThinking && !message.isResearching && parsedContent.text.length > 10 && (
                        <div className="px-1">
                            <FeedbackStars
                                messageId={message.id}
                                sessionId={sessionId}
                                aiResponseSnippet={parsedContent.text}
                                queryContext={previousUserMessage}
                                accessToken={accessToken}
                            />
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
