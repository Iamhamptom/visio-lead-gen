import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Briefcase,
    CheckCircle2,
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
    Store,
    Activity
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
            border: "border-visio-teal/20",
            trend: "Saved contacts"
        },
        {
            label: "Actions Taken",
            value: stats.actions.toString(),
            icon: Activity,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20",
            trend: "Messages & tasks"
        },
        {
            label: "Lead Lists",
            value: stats.campaigns.toString(),
            icon: Briefcase,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
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
        <div className="flex-1 h-full overflow-y-auto p-6 md:p-10 space-y-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl md:text-4xl font-outfit font-bold text-white tracking-tight">
                        {greeting()},{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-visio-teal to-blue-400">
                            {artistProfile?.name || 'Artist'}
                        </span>
                    </h1>
                    <p className="text-white/50 text-sm md:text-base max-w-xl">
                        Here's your strategic career overview. Track your leads, manage campaigns, and launch new initiatives.
                    </p>
                </div>
                <button
                    onClick={onNewChat}
                    className="group relative flex items-center justify-center gap-2 bg-white text-black px-6 py-3.5 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] overflow-hidden shrink-0"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-visio-teal/0 via-visio-teal/10 to-visio-teal/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <Sparkles size={18} className="text-visio-teal" />
                    <span className="relative z-10">Start Session</span>
                </button>
            </div>

            {/* Top Section: Stats & Plan */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left Column: Stats */}
                <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {dashboardStats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="relative bg-[#111111] border border-white/5 rounded-2xl p-6 overflow-hidden group hover:border-white/10 transition-colors"
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} rounded-full blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity -mr-10 -mt-10 pointer-events-none`} />
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.border} border`}>
                                        <stat.icon size={20} className={stat.color} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-1 tracking-tight">{stat.value}</h3>
                                    <p className="text-sm font-medium text-white/60 mb-0.5">{stat.label}</p>
                                    <p className="text-xs text-white/30">{stat.trend}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Right Column: Premium Plan & Credits Combined Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="xl:col-span-4 relative bg-gradient-to-b from-[#1a1a1a] to-[#111111] border border-white/10 rounded-2xl p-6 overflow-hidden flex flex-col justify-between group"
                >
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-visio-teal/10 to-transparent opacity-50 pointer-events-none group-hover:opacity-70 transition-opacity duration-700" />
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-visio-teal/10 rounded-lg border border-visio-teal/20">
                                    <Crown size={16} className="text-visio-teal" />
                                </div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{tierDetails?.name || 'Artist Base'}</h3>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${subscription.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {subscription.status === 'active' ? 'Active' : subscription.status}
                            </span>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-white/40 mb-1">Available Credits</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-4xl font-bold text-white tracking-tight">{displayBalance}</span>
                                    <span className="text-sm font-medium text-white/40">/ {displayAllocation}</span>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${creditsPercent > 50 ? 'bg-gradient-to-r from-visio-teal to-emerald-400' : creditsPercent > 20 ? 'bg-gradient-to-r from-amber-500 to-amber-300' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
                                        style={{ width: `${creditsPercent}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-medium text-white/40 uppercase tracking-wider">
                                    <span>{creditsPercent}% remaining</span>
                                    <span>Resets monthly</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
                        <div className="flex -space-x-1">
                            <div className="w-7 h-7 rounded-full bg-[#222] border-2 border-[#1a1a1a] flex items-center justify-center z-30">
                                <Search size={12} className="text-white/60" />
                            </div>
                            <div className="w-7 h-7 rounded-full bg-[#222] border-2 border-[#1a1a1a] flex items-center justify-center z-20">
                                <Mail size={12} className="text-white/60" />
                            </div>
                            <div className="w-7 h-7 rounded-full bg-[#222] border-2 border-[#1a1a1a] flex items-center justify-center z-10">
                                <Target size={12} className="text-white/60" />
                            </div>
                        </div>
                        {subscription.tier !== 'enterprise' && (
                            <button
                                onClick={() => onNavigate('billing')}
                                className="text-xs font-semibold text-visio-teal hover:text-white transition-colors flex items-center gap-1"
                            >
                                Manage Plan <ArrowUpRight size={14} />
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Tools & Capabilities */}
            <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-white/5 rounded-lg border border-white/10">
                            <Store size={18} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">AI Capabilities</h2>
                    </div>
                    <span className="text-[10px] font-bold bg-white/5 text-white/60 px-3 py-1.5 rounded-full border border-white/10 uppercase tracking-wider">
                        Powered by V-Prai
                    </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {MARKETPLACE_TOOLS.map((tool, i) => (
                        <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * i + 0.4 }}
                            onClick={onNewChat}
                            className="group flex flex-col p-6 rounded-2xl bg-[#111111] border border-white/5 hover:bg-[#151515] hover:border-white/15 transition-all text-left relative overflow-hidden"
                        >
                            <div className={`absolute -right-6 -top-6 w-32 h-32 ${tool.bg} rounded-full blur-[50px] opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
                            
                            <div className="flex items-start justify-between w-full mb-5 relative z-10">
                                <div className={`p-3 rounded-xl ${tool.bg} border border-white/5`}>
                                    <tool.icon size={20} className={tool.color} />
                                </div>
                                <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                                    <Coins size={12} className="text-white/40" />
                                    <span className="text-[10px] font-bold text-white/60">{tool.credits} cr</span>
                                </div>
                            </div>
                            
                            <div className="relative z-10">
                                <h4 className="text-base font-bold text-white mb-1.5 group-hover:text-visio-teal transition-colors">{tool.name}</h4>
                                <p className="text-sm text-white/40 leading-relaxed line-clamp-2">{tool.description}</p>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Lead Lists */}
            <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-white/5 rounded-lg border border-white/10">
                            <Users size={18} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Lead Lists</h2>
                        {leadLists.length > 0 && (
                            <span className="ml-2 text-[10px] font-bold bg-visio-teal/10 text-visio-teal px-2.5 py-1 rounded-full border border-visio-teal/20 uppercase tracking-wider">
                                {leadLists.length} Total
                            </span>
                        )}
                    </div>
                    {leadLists.length > 5 && (
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="text-[11px] font-bold text-white/50 hover:text-white transition-colors flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/10 uppercase tracking-wider"
                        >
                            {showAll ? 'Show less' : `View all (${leadLists.length})`}
                        </button>
                    )}
                </div>

                {leadLists.length === 0 ? (
                    <div className="relative overflow-hidden bg-[#111111] border border-white/5 rounded-3xl p-12 flex flex-col items-center justify-center text-center group">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-visio-teal/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 relative z-10 shadow-inner">
                            <Users size={32} className="text-white/20" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 relative z-10">No leads generated yet</h3>
                        <p className="text-sm text-white/40 max-w-sm mx-auto mb-8 relative z-10 leading-relaxed">
                            Start a new AI session to discover and save industry contacts, curators, and potential partners tailored to your sound.
                        </p>
                        <button
                            onClick={onNewChat}
                            className="relative z-10 flex items-center gap-2 text-sm font-bold bg-white text-black px-6 py-3 rounded-xl hover:bg-gray-200 transition-all shadow-lg hover:shadow-xl"
                        >
                            <Search size={16} />
                            Find Your First Leads
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
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
