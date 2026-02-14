import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Briefcase,
    CheckCircle2,
    Plus,
    Sparkles,
    Users,
    Coins,
    Crown,
    Zap,
    Search,
    FileText,
    BarChart3,
    Mail,
    Target,
    TrendingUp,
    ArrowUpRight,
    Store
} from 'lucide-react';
import { ArtistProfile, LeadList, Subscription, SubscriptionTier } from '../types';
import { LeadListCard } from './LeadListCard';
import { TIER_DETAILS } from '../data/pricing';

interface DashboardOverviewProps {
    artistProfile: ArtistProfile | null;
    onNavigate: (view: any) => void;
    onNewChat: () => void;
    stats?: {
        leads: number;
        actions: number;
        campaigns: number;
    };
    leadLists?: LeadList[];
    onExportLeadList?: (list: LeadList) => void;
    onOpenSession?: (sessionId: string) => void;
    subscription?: Subscription;
    creditsBalance?: number | null;
    creditsAllocation?: number | string | null;
}

const MARKETPLACE_TOOLS = [
    {
        icon: Search,
        name: 'Lead Finder',
        description: 'Find playlist curators, bloggers, journalists & DJs',
        action: 'Find Leads',
        color: 'text-visio-teal',
        bg: 'bg-visio-teal/10',
        credits: 2,
    },
    {
        icon: Mail,
        name: 'Pitch Drafter',
        description: 'AI-powered pitch emails for any campaign',
        action: 'Draft Pitch',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        credits: 1,
    },
    {
        icon: Target,
        name: 'Campaign Planner',
        description: 'Full release campaign with timeline & budget',
        action: 'Plan Campaign',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        credits: 3,
    },
    {
        icon: BarChart3,
        name: 'Competitor Intel',
        description: 'Research competitor strategies & positioning',
        action: 'Research',
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        credits: 3,
    },
    {
        icon: FileText,
        name: 'Press Release',
        description: 'Generate industry-ready press releases',
        action: 'Create',
        color: 'text-pink-400',
        bg: 'bg-pink-500/10',
        credits: 1,
    },
    {
        icon: TrendingUp,
        name: 'Viral Research',
        description: 'Discover trending content & viral patterns',
        action: 'Discover',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        credits: 3,
    },
];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    artistProfile,
    onNavigate,
    onNewChat,
    stats = { leads: 0, actions: 0, campaigns: 0 },
    leadLists = [],
    onExportLeadList,
    onOpenSession,
    subscription = { tier: 'artist' as SubscriptionTier, status: 'active' as const, currentPeriodEnd: 0, interval: 'month' as const },
    creditsBalance = null,
    creditsAllocation = null,
}) => {
    const [showAll, setShowAll] = useState(false);
    const visibleLists = showAll ? leadLists : leadLists.slice(0, 5);

    const tierDetails = TIER_DETAILS[subscription.tier];
    const TierIcon = tierDetails?.icon || Zap;
    const displayBalance = creditsBalance ?? 0;
    const displayAllocation = creditsAllocation === 'unlimited' ? 'Unlimited' : (creditsAllocation ?? tierDetails?.credits ?? 0);
    const creditsPercent = typeof displayAllocation === 'number' && displayAllocation > 0
        ? Math.min(100, Math.round((displayBalance / displayAllocation) * 100))
        : 100;

    const dashboardStats = [
        {
            label: "Total Leads",
            value: stats.leads.toString(),
            icon: CheckCircle2,
            color: "text-visio-teal",
            bg: "bg-visio-teal/10",
            trend: "Saved contacts"
        },
        {
            label: "Actions Taken",
            value: stats.actions.toString(),
            icon: Sparkles,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            trend: "Messages & tasks"
        },
        {
            label: "Lead Lists",
            value: stats.campaigns.toString(),
            icon: Briefcase,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            trend: "From conversations"
        }
    ];

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    return (
        <div className="flex-1 h-full overflow-y-auto p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-outfit font-bold text-white">
                    {greeting()}, <span className="text-visio-teal">{artistProfile?.name || 'Artist'}</span>
                </h1>
                <p className="text-white/40">Here's your career overview and daily focus.</p>
            </div>

            {/* Plan & Credits Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Plan Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-visio-teal/5 rounded-full blur-[60px] pointer-events-none" />
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-visio-teal/10 border border-visio-teal/20">
                                <Crown size={18} className="text-visio-teal" />
                            </div>
                            <div>
                                <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Current Plan</p>
                                <h3 className="text-lg font-bold text-white">{tierDetails?.name || 'Artist Base'}</h3>
                            </div>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${subscription.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {subscription.status === 'active' ? 'Active' : subscription.status}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 relative z-10">
                        {tierDetails?.features?.slice(0, 3).map((feature, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/5">
                                {feature}
                            </span>
                        ))}
                    </div>
                    {subscription.tier !== 'enterprise' && (
                        <button
                            onClick={() => onNavigate('billing')}
                            className="mt-4 text-xs text-visio-teal hover:text-visio-teal/80 flex items-center gap-1 transition-colors relative z-10"
                        >
                            Upgrade Plan <ArrowUpRight size={12} />
                        </button>
                    )}
                </motion.div>

                {/* Credits Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/5 border border-white/5 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <Coins size={18} className="text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Credits</p>
                                <h3 className="text-lg font-bold text-white">
                                    {displayBalance} <span className="text-white/30 text-sm font-normal">/ {typeof displayAllocation === 'number' ? displayAllocation : displayAllocation}</span>
                                </h3>
                            </div>
                        </div>
                        <span className="text-xs text-white/30">per month</span>
                    </div>
                    <div className="mt-3">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${creditsPercent > 50 ? 'bg-visio-teal' : creditsPercent > 20 ? 'bg-amber-400' : 'bg-red-400'}`}
                                style={{ width: `${creditsPercent}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-white/30 mt-1.5">{creditsPercent}% remaining this month</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">Chat: Free</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">Search: 1 cr</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">Lead Gen: 2 cr</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">Deep: 5 cr</span>
                    </div>
                </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dashboardStats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white/5 border border-white/5 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/10 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg}`}>
                                <stat.icon size={20} className={stat.color} />
                            </div>
                            <span className="text-xs text-white/30 font-medium bg-white/5 px-2 py-1 rounded-full">
                                {stat.trend}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                            <p className="text-sm text-white/50">{stat.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Marketplace / Tools */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Store size={20} className="text-visio-teal" />
                    <h2 className="text-xl font-bold text-white">Marketplace</h2>
                    <span className="text-xs bg-visio-teal/10 text-visio-teal px-2 py-0.5 rounded-full border border-visio-teal/20">
                        AI Tools
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {MARKETPLACE_TOOLS.map((tool, i) => (
                        <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * i }}
                            onClick={onNewChat}
                            className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/10 transition-all text-left group"
                        >
                            <div className={`p-2.5 rounded-lg ${tool.bg} shrink-0`}>
                                <tool.icon size={18} className={tool.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-white group-hover:text-visio-teal transition-colors">{tool.name}</h4>
                                    <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                                        <Coins size={10} />{tool.credits} cr
                                    </span>
                                </div>
                                <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{tool.description}</p>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-32 bg-visio-teal/5 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-visio-teal/10 transition-all duration-700" />
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-visio-teal/20 flex items-center justify-center text-visio-teal">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Consult & Chat</h3>
                            <p className="text-sm text-white/50 mb-6 max-w-sm">
                                Start a new session with V-Prai to develop your brand, find leads, or plan your next release.
                            </p>
                            <button
                                onClick={onNewChat}
                                className="flex items-center gap-2 bg-visio-teal text-black px-5 py-2.5 rounded-xl font-medium hover:bg-visio-teal/90 transition-colors"
                            >
                                <Plus size={18} />
                                Start New Session
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lead Lists */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users size={20} className="text-visio-teal" />
                        <h2 className="text-xl font-bold text-white">Your Lead Lists</h2>
                        {leadLists.length > 0 && (
                            <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
                                {leadLists.length}
                            </span>
                        )}
                    </div>
                    {leadLists.length > 5 && (
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="text-sm text-visio-teal hover:text-visio-teal/80 transition-colors"
                        >
                            {showAll ? 'Show less' : `Show all (${leadLists.length})`}
                        </button>
                    )}
                </div>

                {leadLists.length === 0 ? (
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-8 text-center">
                        <Users size={32} className="text-white/20 mx-auto mb-3" />
                        <p className="text-white/40 text-sm">No leads yet. Start a conversation to generate leads.</p>
                        <button
                            onClick={onNewChat}
                            className="mt-4 text-sm text-visio-teal hover:text-visio-teal/80 transition-colors"
                        >
                            Start a session
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visibleLists.map((list) => (
                            <LeadListCard
                                key={list.id}
                                list={list}
                                onExport={onExportLeadList || (() => { })}
                                onOpenSession={onOpenSession || (() => { })}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
