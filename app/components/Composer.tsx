import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Sparkles, Phone, Zap, Briefcase, Rocket, ChevronDown, Lock, Search, User, Brain, Coins } from 'lucide-react';

import { AgentMode } from '@/app/types';

export type AITier = 'instant' | 'business' | 'enterprise';

interface ComposerProps {
    onSend: (text: string, tier: AITier, mode: AgentMode) => void;
    isLoading: boolean;
    pendingPrompt?: string | null;
    onPromptUsed?: () => void;
    portalLocked?: boolean;
    onRequirePortal?: () => void;
    webSearchEnabled: boolean;
    onToggleWebSearch: () => void;
    artistContextEnabled?: boolean;
    onToggleArtistContext?: () => void;
    isRestricted?: boolean;
    subscriptionTier?: string;
    creditsBalance?: number | null;
    onStartVoiceCall?: () => void;
}

const TIER_CONFIG = {
    instant: {
        label: 'Instant',
        icon: Zap,
        color: 'text-white/70',
        bgColor: 'bg-white/5',
        borderColor: 'border-white/10',
        description: 'Fast responses (Free)'
    },
    business: {
        label: 'Business',
        icon: Briefcase,
        color: 'text-white/70',
        bgColor: 'bg-white/5',
        borderColor: 'border-white/10',
        description: 'Detailed analysis'
    },
    enterprise: {
        label: 'Enterprise',
        icon: Rocket,
        color: 'text-white',
        bgColor: 'bg-white/10',
        borderColor: 'border-white/20',
        description: 'Full capabilities + Priority'
    }
};

export const Composer: React.FC<ComposerProps> = ({
    onSend,
    isLoading,
    pendingPrompt,
    onPromptUsed,
    portalLocked = false,
    onRequirePortal,
    webSearchEnabled,
    onToggleWebSearch,
    artistContextEnabled = true,
    onToggleArtistContext,
    isRestricted = false,
    subscriptionTier = 'artist',
    creditsBalance = null,
    onStartVoiceCall
}) => {
    const isDeepThinkingAllowed = ['enterprise', 'agency'].includes(subscriptionTier);
    const [input, setInput] = useState('');
    const [tier, setTier] = useState<AITier>('business');
    const [mode, setMode] = useState<AgentMode>('chat');
    const [showTierMenu, setShowTierMenu] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const tierMenuRef = useRef<HTMLDivElement>(null);

    // Handle pending prompt from command menu
    useEffect(() => {
        if (pendingPrompt) {
            setInput(pendingPrompt);
            onPromptUsed?.();
            // Focus the textarea
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [pendingPrompt, onPromptUsed]);

    useEffect(() => {
        if (portalLocked && mode === 'research') {
            setMode('chat');
        }
    }, [portalLocked, mode]);

    const handleSubmit = () => {
        if (!input.trim() || isLoading) return;
        if (portalLocked && mode === 'research') {
            onRequirePortal?.();
            return;
        }
        onSend(input, tier, mode);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

    // Close tier menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (tierMenuRef.current && !tierMenuRef.current.contains(e.target as Node)) {
                setShowTierMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentTier = TIER_CONFIG[tier];
    const TierIcon = currentTier.icon;
    const isResearchLocked = portalLocked;

    return (
        <div className="w-full max-w-4xl mx-auto px-4 pb-6">
            <div className="relative group">

                {/* Gradient Border Effect */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-visio-teal/40 via-visio-accent/40 to-visio-teal/40 rounded-3xl opacity-0 group-focus-within:opacity-100 transition duration-500 blur-sm"></div>

                <div className="relative bg-[#0A0A0A] border border-white/10 rounded-3xl flex flex-col shadow-2xl">

                    {isRestricted && (
                        <div className="mx-4 mt-3 py-1.5 px-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2 text-[10px] text-yellow-200/70">
                            <Lock size={10} />
                            <span className="font-medium uppercase tracking-wide">Preview Mode Active</span>
                            <span className="opacity-50 mx-1">|</span>
                            <span>Full research capabilties are locked pending approval.</span>
                        </div>
                    )}

                    {/* Tier Selector Bar */}
                    <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-white/5">
                        <div className="relative" ref={tierMenuRef}>
                            <button
                                onClick={() => setShowTierMenu(!showTierMenu)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${currentTier.bgColor} ${currentTier.color} border ${currentTier.borderColor} hover:scale-105`}
                            >
                                <TierIcon size={14} />
                                <span>{currentTier.label}</span>
                                <ChevronDown size={12} className={`transition-transform ${showTierMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Tier Dropdown */}
                            {showTierMenu && (
                                <div className="absolute bottom-full left-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 min-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                                    {(Object.keys(TIER_CONFIG) as AITier[]).map((t) => {
                                        const config = TIER_CONFIG[t];
                                        const Icon = config.icon;
                                        const isActive = tier === t;
                                        return (
                                            <button
                                                key={t}
                                                onClick={() => { setTier(t); setShowTierMenu(false); }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                            >
                                                <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
                                                    <Icon size={16} className={config.color} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-white/80'}`}>{config.label}</p>
                                                    <p className="text-[10px] text-white/40">{config.description}</p>
                                                </div>
                                                {isActive && (
                                                    <div className="w-2 h-2 rounded-full bg-white" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Mode + Web Search */}
                        <div className="flex items-center gap-2">
                            {onToggleArtistContext && (
                                <button
                                    type="button"
                                    onClick={onToggleArtistContext}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${artistContextEnabled
                                        ? 'border-visio-accent/40 bg-visio-accent/15 text-visio-accent'
                                        : 'border-white/10 bg-white/5 text-white/50 hover:text-white/70'
                                        }`}
                                    aria-pressed={artistContextEnabled}
                                    title={artistContextEnabled ? 'Artist context is ON — responses use your profile data' : 'Artist context is OFF — general mode'}
                                >
                                    <User size={12} />
                                    Artist Portal
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onToggleWebSearch}
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${webSearchEnabled
                                    ? 'border-visio-teal/40 bg-visio-teal/15 text-visio-teal'
                                    : 'border-white/10 bg-white/5 text-white/50 hover:text-white/70'
                                    }`}
                                aria-pressed={webSearchEnabled}
                            >
                                <Search size={12} />
                                Web Search
                            </button>
                            {/* Credits Display */}
                            {creditsBalance !== null && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-white/50 border border-white/10 bg-white/5 rounded-md">
                                    <Coins size={12} className="text-visio-teal" />
                                    <span>{creditsBalance === Infinity ? 'Unlimited' : creditsBalance}</span>
                                </div>
                            )}
                            <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                                <button
                                    onClick={() => setMode('chat')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'chat' ? 'bg-visio-teal/20 text-visio-teal shadow-sm' : 'text-white/40 hover:text-white/60'
                                        }`}
                                >
                                    Chat
                                </button>
                                <button
                                    onClick={() => {
                                        if (isResearchLocked) {
                                            onRequirePortal?.();
                                            return;
                                        }
                                        setMode('research');
                                    }}
                                    aria-disabled={isResearchLocked}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${mode === 'research' ? 'bg-visio-accent/20 text-visio-accent shadow-sm' : 'text-white/40 hover:text-white/60'} ${isResearchLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isResearchLocked && <Lock size={12} className="text-white/50" />}
                                    Research
                                </button>
                                <button
                                    onClick={() => {
                                        if (!isDeepThinkingAllowed) return;
                                        setMode('deep_thinking');
                                    }}
                                    disabled={!isDeepThinkingAllowed}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${mode === 'deep_thinking' ? 'bg-purple-500/20 text-purple-400 shadow-sm' : 'text-white/40 hover:text-white/60'} ${!isDeepThinkingAllowed ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    title={isDeepThinkingAllowed ? 'Deep Thinking — extended reasoning (5 credits)' : 'Deep Thinking requires Enterprise or Agency tier'}
                                >
                                    {!isDeepThinkingAllowed && <Lock size={10} className="text-white/40" />}
                                    <Brain size={12} />
                                    Deep Think
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Deep Thinking Indicator */}
                    {mode === 'deep_thinking' && (
                        <div className="mx-4 mt-2 py-1.5 px-3 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center gap-2 text-[10px]">
                            <Brain size={12} className="text-purple-400" />
                            <span className="text-purple-400 font-medium">Deep Thinking Mode</span>
                            <span className="text-purple-400/50 mx-1">|</span>
                            <span className="text-purple-400/60">Extended reasoning enabled (5 credits per query)</span>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="flex items-end p-2">
                        <button
                            onClick={() => alert("File attachments coming soon!")}
                            className="p-3 text-white/40 hover:text-visio-accent transition-colors rounded-full hover:bg-white/5"
                        >
                            <Paperclip size={20} />
                        </button>

                        <textarea
                            ref={textareaRef}
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask V-Prai to find leads, brainstorm campaigns..."
                            className="flex-1 bg-transparent text-white border-0 focus:ring-0 resize-none py-3 px-2 max-h-40 placeholder:text-white/20 outline-none"
                            disabled={isLoading}
                        />

                        <div className="flex items-center gap-1 pb-1">
                            {onStartVoiceCall && (
                                <button
                                    onClick={onStartVoiceCall}
                                    className="p-2 text-visio-teal/70 hover:text-visio-teal hover:bg-visio-teal/10 transition-colors rounded-full"
                                    title="Call V-Prai — voice conversation"
                                >
                                    <Phone size={18} />
                                </button>
                            )}
                            <button
                                onClick={handleSubmit}
                                disabled={!input.trim() || isLoading}
                                className={`p-2 rounded-full transition-all duration-300 ${input.trim() && !isLoading
                                    ? 'bg-white text-black hover:scale-105'
                                    : 'bg-white/5 text-white/20'
                                    }`}
                            >
                                {isLoading ? <Sparkles size={18} className="animate-spin" /> : <Send size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                <p className="text-center text-[10px] text-white/20 mt-3 font-medium flex items-center justify-center gap-4">
                    <span>V-Prai can make mistakes. Please verify important contact information.</span>
                    <button
                        onClick={() => {
                            const data = prompt("Paste your Artist Portal JSON/Text here:");
                            if (data) {
                                onSend(`IMPORT_PORTAL_DATA: ${data}`, 'business', 'chat');
                            }
                        }}
                        className="text-visio-teal/50 hover:text-visio-teal transition-colors underline decoration-dotted"
                    >
                        Import from Portal
                    </button>
                </p>
            </div>
        </div>
    );
};
