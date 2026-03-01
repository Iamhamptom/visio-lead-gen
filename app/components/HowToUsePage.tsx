'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    User,
    MessageSquare,
    BookmarkPlus,
    Zap,
    ArrowRight,
    HelpCircle,
    ChevronRight,
    Settings,
    Sparkles,
    FileText,
    Mail,
    PlayCircle
} from 'lucide-react';

import { ViewMode } from '../types';

interface HowToUsePageProps {
    onNavigate: (view: ViewMode) => void;
    onRelaunchTutorial: () => void;
}

const GUIDE_STEPS: Array<{
    number: string;
    icon: React.FC<any>;
    title: string;
    description: string;
    action: ViewMode;
    actionLabel: string;
    color: string;
    bg: string;
    border: string;
    glow: string;
}> = [
    {
        number: '01',
        icon: User,
        title: 'Create Your Profile',
        description: 'Navigate to Settings and complete your artist or label profile. Include your genre, target markets, and goals so the AI can personalize your experience.',
        action: 'settings',
        actionLabel: 'Open Settings',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        glow: 'from-blue-500/0 via-blue-500/5 to-blue-500/10'
    },
    {
        number: '02',
        icon: MessageSquare,
        title: 'Start a PR Consultation',
        description: 'Open a new chat session from the sidebar. Describe your campaign goals, upcoming releases, or the type of contacts you need. The AI will guide you through a consultative process.',
        action: 'dashboard',
        actionLabel: 'Start Chatting',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        glow: 'from-purple-500/0 via-purple-500/5 to-purple-500/10'
    },
    {
        number: '03',
        icon: BookmarkPlus,
        title: 'Save & Manage Leads',
        description: 'When the AI finds relevant contacts, click "Save Lead" to add them to your personal lead database. You can filter, sort, and view your saved contacts anytime.',
        action: 'leads',
        actionLabel: 'View Lead Database',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        glow: 'from-emerald-500/0 via-emerald-500/5 to-emerald-500/10'
    },
    {
        number: '04',
        icon: Zap,
        title: 'Upgrade Your Plan',
        description: 'Start free with basic queries. As your needs grow, upgrade to get unlimited searches, deep contact enrichment, and priority AI access.',
        action: 'billing',
        actionLabel: 'View Plans',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        glow: 'from-amber-500/0 via-amber-500/5 to-amber-500/10'
    }
];

const FAQ = [
    {
        q: 'What kind of contacts can V-Prai find?',
        a: 'V-Prai specializes in the music and entertainment industry — playlist curators, music journalists, radio DJs, PR agencies, booking agents, A&R reps, and more.'
    },
    {
        q: 'How accurate are the search results?',
        a: 'V-Prai uses live web data enriched by AI. Results are verified in real-time, but we always recommend double-checking contact details before outreach.'
    },
    {
        q: 'Can I export my leads?',
        a: 'Yes! You can view and manage all saved leads from the Lead Database. Export features are available on paid plans.'
    },
    {
        q: 'What if I need help?',
        a: 'Contact our support team at admin@visiocorp.co — we typically respond within 24 hours.'
    }
];

export const HowToUsePage: React.FC<HowToUsePageProps> = ({ onNavigate, onRelaunchTutorial }) => {
    return (
        <div className="flex-1 h-full overflow-y-auto scroll-smooth">
            <div className="max-w-5xl mx-auto px-6 py-12 md:px-12 md:py-20 space-y-20">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-end justify-between gap-8"
                >
                    <div className="space-y-5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-visio-teal/10 border border-visio-teal/20">
                            <HelpCircle size={14} className="text-visio-teal" />
                            <span className="text-xs font-semibold text-visio-teal tracking-widest uppercase">Help Center</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                            How to Use V-Prai
                        </h1>
                        <p className="text-lg md:text-xl text-white/60 leading-relaxed font-light">
                            A step-by-step guide to getting the most out of your AI PR assistant. From setting up your profile to managing leads.
                        </p>
                    </div>

                    <button
                        onClick={onRelaunchTutorial}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98] group shrink-0 shadow-lg shadow-black/20"
                    >
                        <PlayCircle size={18} className="text-visio-teal group-hover:text-white transition-colors" />
                        Replay Tutorial
                    </button>
                </motion.div>

                {/* Steps Section */}
                <div className="space-y-8">
                    <div className="flex items-center gap-3 mb-8">
                        <Sparkles size={24} className="text-white/40" />
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Getting Started</h2>
                    </div>
                    
                    <div className="grid gap-6">
                        {GUIDE_STEPS.map((step, i) => (
                            <motion.div
                                key={step.number}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="group relative bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-3xl p-6 md:p-8 transition-all duration-300 hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-black/40 overflow-hidden"
                            >
                                {/* Background Gradient Glow on Hover */}
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${step.glow} pointer-events-none`} />

                                <div className="relative z-10 flex flex-col md:flex-row items-start gap-6 md:gap-8">
                                    {/* Number Badge */}
                                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner backdrop-blur-sm">
                                        <span className={`text-2xl font-black ${step.color} opacity-90`}>{step.number}</span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-xl ${step.bg} border ${step.border} backdrop-blur-sm`}>
                                                <step.icon size={22} className={step.color} />
                                            </div>
                                            <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">{step.title}</h3>
                                        </div>
                                        <p className="text-white/60 leading-relaxed text-base md:text-lg">
                                            {step.description}
                                        </p>

                                        {/* Action Button */}
                                        <button
                                            onClick={() => onNavigate(step.action)}
                                            className="inline-flex items-center gap-2 text-sm font-semibold text-white/50 hover:text-white transition-colors group/btn mt-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 px-5 py-2.5 rounded-xl"
                                        >
                                            {step.actionLabel}
                                            <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* FAQ Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-8 pt-8 border-t border-white/10"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <FileText size={24} className="text-white/40" />
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Frequently Asked Questions</h2>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        {FAQ.map((item, i) => (
                            <div
                                key={i}
                                className="bg-white/5 border border-white/5 rounded-2xl p-6 md:p-8 hover:bg-white/[0.08] hover:border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 group"
                            >
                                <h4 className="font-bold text-lg text-white mb-3 tracking-tight group-hover:text-visio-teal transition-colors">{item.q}</h4>
                                <p className="text-white/60 leading-relaxed">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Contact Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center border border-visio-teal/20 bg-visio-teal/5"
                >
                    {/* Background styling */}
                    <div className="absolute inset-0 bg-gradient-to-br from-visio-teal/20 via-visio-teal/5 to-transparent opacity-60" />
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="p-4 rounded-full bg-visio-teal/10 border border-visio-teal/20 mb-6 backdrop-blur-md shadow-inner">
                            <Mail size={32} className="text-visio-teal" />
                        </div>
                        <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Still Need Help?</h3>
                        <p className="text-white/60 text-lg md:text-xl mb-10 max-w-lg mx-auto font-light">
                            Our team is here to assist you with any questions or technical issues you might encounter.
                        </p>
                        <a
                            href="mailto:admin@visiocorp.co"
                            className="inline-flex items-center justify-center gap-3 bg-visio-teal text-black px-8 py-4 rounded-xl font-bold text-base hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-visio-teal/20"
                        >
                            <Mail size={18} />
                            Contact Support
                        </a>
                    </div>
                </motion.div>

                {/* Bottom Spacer */}
                <div className="h-12" />
            </div>
        </div>
    );
};