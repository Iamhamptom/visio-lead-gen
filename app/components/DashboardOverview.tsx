import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Briefcase,
    CheckCircle2,
    Plus,
    Sparkles,
    Users
} from 'lucide-react';
import { ArtistProfile, LeadList } from '../types';
import { LeadListCard } from './LeadListCard';

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
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    artistProfile,
    onNavigate,
    onNewChat,
    stats = { leads: 0, actions: 0, campaigns: 0 },
    leadLists = [],
    onExportLeadList,
    onOpenSession
}) => {
    const [showAll, setShowAll] = useState(false);
    const visibleLists = showAll ? leadLists : leadLists.slice(0, 5);

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
                                Start a new session with Visio AI to develop your brand, find leads, or plan your next release.
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
