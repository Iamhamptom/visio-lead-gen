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
    Mail
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
            border: 'border-blue-500/20'
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
            border: 'border-purple-500/20'
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
            border: 'border-emerald-500/20'
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
            border: 'border-amber-500/20'
        }
    ];

const FAQ = [
    {
        q: 'What kind of contacts can Visio find?',
        a: 'Visio specializes in the music and entertainment industry — playlist curators, music journalists, radio DJs, PR agencies, booking agents, A&R reps, and more.'
    },
    {
        q: 'How accurate are the search results?',
        a: 'Visio uses live web data enriched by AI. Results are verified in real-time, but we always recommend double-checking contact details before outreach.'
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
        <div className="flex-1 h-full overflow-y-auto p-6 md:p-10">
            <div className="max-w-3xl mx-auto space-y-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-visio-teal/10">
                            <HelpCircle size={22} className="text-visio-teal" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">How to Use Visio</h1>
                    </div>
                    <p className="text-white/50 text-lg leading-relaxed">
                        A step-by-step guide to getting the most out of your AI PR assistant. From setting up your profile to managing leads.
                    </p>

                    {/* Relaunch Tutorial */}
                    <button
                        onClick={onRelaunchTutorial}
                        className="flex items-center gap-2 text-sm font-medium text-visio-teal hover:text-visio-teal/80 transition-colors group"
                    >
                        <Sparkles size={16} />
                        Replay Interactive Tutorial
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </motion.div>

                {/* Steps */}
                <div className="space-y-6">
                    {GUIDE_STEPS.map((step, i) => (
                        <motion.div
                            key={step.number}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`bg-white/5 border ${step.border} rounded-2xl p-6 md:p-8 hover:bg-white/[0.07] transition-colors group`}
                        >
                            <div className="flex items-start gap-5">
                                {/* Number */}
                                <div className="hidden md:flex flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-white/10 items-center justify-center">
                                    <span className="text-lg font-bold text-white/20">{step.number}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${step.bg}`}>
                                            <step.icon size={18} className={step.color} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white">{step.title}</h3>
                                    </div>
                                    <p className="text-white/50 leading-relaxed">{step.description}</p>

                                    {/* Action */}
                                    <button
                                        onClick={() => onNavigate(step.action)}
                                        className="flex items-center gap-2 text-sm font-medium text-white/40 hover:text-white transition-colors group/btn mt-2"
                                    >
                                        {step.actionLabel}
                                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* FAQ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-6"
                >
                    <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        {FAQ.map((item, i) => (
                            <div
                                key={i}
                                className="bg-white/5 border border-white/5 rounded-xl p-6 hover:bg-white/[0.07] transition-colors"
                            >
                                <h4 className="font-bold text-white mb-2">{item.q}</h4>
                                <p className="text-white/50 text-sm leading-relaxed">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Contact */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-br from-visio-teal/10 to-transparent border border-visio-teal/20 rounded-2xl p-8 text-center"
                >
                    <Mail size={28} className="text-visio-teal mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Still Need Help?</h3>
                    <p className="text-white/50 mb-6 text-sm">Our team is here to help. Reach out anytime.</p>
                    <a
                        href="mailto:admin@visiocorp.co"
                        className="inline-flex items-center gap-2 bg-visio-teal text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-visio-teal/90 transition-colors"
                    >
                        <Mail size={16} />
                        Contact Support
                    </a>
                </motion.div>

                {/* Spacer */}
                <div className="h-8" />
            </div>
        </div>
    );
};
