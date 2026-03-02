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
        color: 'text-white/80',
        bgColor: 'bg-white/5',
        activeBg: 'bg-white/10',
        borderColor: 'border-white/10',
        description: 'Fast responses (Free)'
    },
    business: {
        label: 'Business',
        icon: Briefcase,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        activeBg: 'bg-blue-500/20',
        borderColor: 'border-blue-500/20',
        description: 'Detailed analysis'
    },
    enterprise: {
        label: 'Enterprise',
        icon: Rocket,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        activeBg: 'bg-purple-500/20',
        borderColor: 'border-purple-500/20',
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
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
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
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
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
        <div className="w-full max-w-4xl mx-auto px-4 pb-8">
            <div className="relative group flex flex-col gap-2">

                {/* Main Composer Box */}
                <div className="relative bg-[#0F0F0F]/95 backdrop-blur-2xl border border-white/[0.08] hover:border-white/[0.12] transition-colors rounded-[28px] shadow-2xl flex flex-col overflow-visible z-10">
                    
                    {/* Glowing effect behind composer */}
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-visio-teal/20 via-transparent to-visio-accent/20 rounded-[28px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none -z-10 blur-xl"></div>

                    {isRestricted && (
                        <div className="mx-4 mt-4 py-2 px-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-2 text-[11px] text-yellow-200/80 backdrop-blur-md">
                            <Lock size={12} className="text-yellow-400" />
                            <span className="font-semibold uppercase tracking-wider text-yellow-400">Preview Mode</span>
                            <span className="opacity-40 mx-1">|</span>
                            <span>Full research capabilities are locked pending approval.</span>
                        </div>
                    )}

                    {/* Deep Thinking Indicator */}
                    {mode === 'deep_thinking' && (
                        <div className="mx-4 mt-4 py-2 px-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-2 text-[11px] backdrop-blur-md transition-all">
                            <Brain size={12} className="text-purple-400 animate-pulse" />
                            <span className="text-purple-300 font-semibold tracking-wide">Deep Thinking Active</span>
                            <span className="text-purple-400/30 mx-1">|</span>
                            <span className="text-purple-300/70">Extended reasoning enabled (5 credits/query)</span>
                        </div>
                    )}

                    {/* Top Bar: Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-y-3 px-4 pt-4 pb-2">
                        {/* Left Side: Tier Selector */}
                        <div className="relative" ref={tierMenuRef}>
                            <button
                                onClick={() => setShowTierMenu(!showTierMenu)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-300 ${currentTier.bgColor} ${currentTier.color} border ${currentTier.borderColor} hover:opacity-80 active:scale-95`}
                            >
                                <TierIcon size={14} className={currentTier.color} />
                                <span>{currentTier.label}</span>
                                <ChevronDown size={14} className={`transition-transform duration-300 opacity-70 ${showTierMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Tier Dropdown Menu */}
                            {showTierMenu && (
                                <div className="absolute bottom-full left-0 mb-3 bg-[#1A1A1A]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-50 min-w-[240px] animate-in fade-in slide-in-from-bottom-2 duration-200 origin-bottom-left">
                                    <div className="p-2 flex flex-col gap-1">
                                        {(Object.keys(TIER_CONFIG) as AITier[]).map((t) => {
                                            const config = TIER_CONFIG[t];
                                            const Icon = config.icon;
                                            const isActive = tier === t;
                                            return (
                                                <button
                                                    key={t}
                                                    onClick={() => { setTier(t); setShowTierMenu(false); }}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${isActive ? config.activeBg : 'hover:bg-white/5'}`}
                                                >
                                                    <div className={`p-2 rounded-lg ${isActive ? 'bg-white/10' : config.bgColor}`}>
                                                        <Icon size={16} className={config.color} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`text-[13px] font-semibold ${isActive ? 'text-white' : 'text-white/80'}`}>{config.label}</p>
                                                        <p className="text-[11px] text-white/50 mt-0.5">{config.description}</p>
                                                    </div>
                                                    {isActive && (
                                                        <div className={`w-1.5 h-1.5 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Tools & Modes */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Tools Group */}
                            <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/[0.05]">
                                {onToggleArtistContext && (
                                    <button
                                        type="button"
                                        onClick={onToggleArtistContext}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-200 ${artistContextEnabled
                                            ? 'bg-visio-accent/20 text-visio-accent shadow-[0_0_10px_rgba(var(--visio-accent-rgb),0.2)]'
                                            : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                                            }`}
                                        title="Artist Context"
                                    >
                                        <User size={14} />
                                        <span className="hidden sm:inline">Context</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onToggleWebSearch}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-200 ${webSearchEnabled
                                        ? 'bg-visio-teal/20 text-visio-teal shadow-[0_0_10px_rgba(var(--visio-teal-rgb),0.2)]'
                                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                                        }`}
                                >
                                    <Search size={14} />
                                    <span className="hidden sm:inline">Web</span>
                                </button>
                                
                                {creditsBalance !== null && (
                                    <>
                                        <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-white/70">
                                            <Coins size={14} className="text-yellow-500/80" />
                                            <span>{creditsBalance === Infinity ? '∞' : creditsBalance}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Mode Segmented Control */}
                            <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/[0.05]">
                                <button
                                    onClick={() => setMode('chat')}
                                    className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-300 ${mode === 'chat' 
                                        ? 'bg-white/10 text-white shadow-sm' 
                                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
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
                                    className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-300 flex items-center gap-1.5 ${mode === 'research' 
                                        ? 'bg-visio-accent/20 text-visio-accent shadow-sm' 
                                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'} ${isResearchLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isResearchLocked && <Lock size={12} className="opacity-70" />}
                                    Research
                                </button>
                                <button
                                    onClick={() => {
                                        if (!isDeepThinkingAllowed) return;
                                        setMode('deep_thinking');
                                    }}
                                    disabled={!isDeepThinkingAllowed}
                                    className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-300 flex items-center gap-1.5 ${mode === 'deep_thinking' 
                                        ? 'bg-purple-500/20 text-purple-400 shadow-sm' 
                                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'} ${!isDeepThinkingAllowed ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    title={!isDeepThinkingAllowed ? 'Requires Enterprise or Agency tier' : 'Deep Thinking'}
                                >
                                    {!isDeepThinkingAllowed && <Lock size={12} className="opacity-70" />}
                                    <Brain size={14} className={mode === 'deep_thinking' ? 'animate-pulse' : ''} />
                                    <span className="hidden sm:inline">Deep Think</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="flex items-end px-4 pb-4 pt-2 gap-2">
                        <button
                            onClick={() => alert("File attachments coming soon!")}
                            className="p-2.5 text-white/40 hover:text-white transition-colors rounded-xl hover:bg-white/10 active:scale-95 mb-1"
                            title="Attach File"
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
                            className="flex-1 bg-transparent text-white border-0 focus:ring-0 resize-none py-3 px-2 max-h-[200px] min-h-[44px] placeholder:text-white/30 outline-none text-[15px] leading-relaxed"
                            disabled={isLoading}
                            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}
                        />

                        <div className="flex items-center gap-2 mb-1">
                            {onStartVoiceCall && (
                                <button
                                    onClick={onStartVoiceCall}
                                    className="p-2.5 text-visio-teal/70 hover:text-visio-teal hover:bg-visio-teal/10 transition-colors rounded-xl active:scale-95"
                                    title="Voice Conversation"
                                >
                                    <Phone size={20} />
                                </button>
                            )}
                            <button
                                onClick={handleSubmit}
                                disabled={!input.trim() || isLoading}
                                className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center min-w-[44px] min-h-[44px] ${input.trim() && !isLoading
                                    ? 'bg-white text-black hover:bg-gray-100 hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                                    : 'bg-white/5 text-white/30'
                                    }`}
                            >
                                {isLoading ? <Sparkles size={20} className="animate-spin" /> : <Send size={20} className={input.trim() && !isLoading ? 'ml-0.5' : ''} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Text */}
                <div className="flex items-center justify-center gap-4 mt-2 px-4">
                    <p className="text-[11px] text-white/40 font-medium tracking-wide">
                        V-Prai can make mistakes. Please verify important information.
                    </p>
                    <button
                        onClick={() => {
                            const data = prompt("Paste your Artist Portal JSON/Text here:");
                            if (data) {
                                onSend(`IMPORT_PORTAL_DATA: ${data}`, 'business', 'chat');
                            }
                        }}
                        className="text-[11px] text-white/30 hover:text-visio-teal transition-colors underline decoration-dotted underline-offset-2"
                    >
                        Import Portal Data
                    </button>
                </div>
            </div>
        </div>
    );
};
