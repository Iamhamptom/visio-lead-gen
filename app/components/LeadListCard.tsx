'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    ChevronUp,
    Download,
    MessageSquare,
    Users,
    Target,
    Lightbulb,
    Filter,
    LayoutGrid,
    LayoutList,
    Globe
} from 'lucide-react';
import { LeadList, Lead } from '../types';
import { parseFollowerCount } from '@/lib/utils';

const FOLLOWER_RANGES = [
    { label: 'All', min: 0, max: Infinity },
    { label: '1K - 10K', min: 1000, max: 10000 },
    { label: '10K - 50K', min: 10000, max: 50000 },
    { label: '50K - 100K', min: 50000, max: 100000 },
    { label: '100K - 500K', min: 100000, max: 500000 },
    { label: '500K+', min: 500000, max: Infinity },
];

interface LeadListCardProps {
    list: LeadList;
    onExport: (list: LeadList) => void;
    onOpenSession: (sessionId: string) => void;
}

export const LeadListCard: React.FC<LeadListCardProps> = ({ list, onExport, onOpenSession }) => {
    const [expanded, setExpanded] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [followerRange, setFollowerRange] = useState(FOLLOWER_RANGES[0]);
    const [countryFilter, setCountryFilter] = useState<string>('all');
    const [search, setSearch] = useState('');

    const countries = useMemo(() => {
        const set = new Set<string>();
        list.leads.forEach(l => { if (l.country) set.add(l.country); });
        return Array.from(set).sort();
    }, [list.leads]);

    const filteredLeads = useMemo(() => {
        return list.leads.filter(lead => {
            // Follower filter
            const count = parseFollowerCount(lead.followers);
            if (count < followerRange.min || count > followerRange.max) return false;
            // Country filter
            if (countryFilter !== 'all' && lead.country !== countryFilter) return false;
            // Search
            if (search) {
                const q = search.toLowerCase();
                return (lead.name?.toLowerCase().includes(q) ||
                    lead.title?.toLowerCase().includes(q) ||
                    lead.company?.toLowerCase().includes(q) ||
                    lead.email?.toLowerCase().includes(q));
            }
            return true;
        });
    }, [list.leads, followerRange, countryFilter, search]);

    return (
        <motion.div
            layout
            className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors"
        >
            {/* Collapsed Header */}
            <div
                onClick={() => setExpanded(!expanded)}
                className="flex items-center justify-between p-5 cursor-pointer group"
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2.5 rounded-xl bg-visio-teal/10">
                        <Users size={18} className="text-visio-teal" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-white font-semibold truncate">{list.title}</h3>
                        {list.brief && (
                            <p className="text-white/40 text-sm truncate mt-0.5">{list.brief.summary}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-xs bg-visio-teal/20 text-visio-teal px-2.5 py-1 rounded-full font-medium">
                        {list.leads.length} leads
                    </span>
                    {list.country && (
                        <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded-full">
                            {list.country}
                        </span>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onExport(list); }}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        title="Export CSV"
                    >
                        <Download size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpenSession(list.sessionId); }}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        title="Open Conversation"
                    >
                        <MessageSquare size={16} />
                    </button>
                    {expanded ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 space-y-4">
                            {/* Strategy Brief */}
                            {list.brief && (
                                <div className="bg-white/5 rounded-xl p-4 space-y-2 border border-white/5">
                                    <h4 className="text-visio-teal text-xs font-semibold uppercase tracking-wider">Strategy Brief</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        <div className="flex gap-2">
                                            <Target size={14} className="text-purple-400 mt-0.5 shrink-0" />
                                            <div>
                                                <span className="text-white/40 text-xs">Target Audience</span>
                                                <p className="text-white/80">{list.brief.targetAudience}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Lightbulb size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                                            <div>
                                                <span className="text-white/40 text-xs">Objective</span>
                                                <p className="text-white/80">{list.brief.objective}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-full flex gap-2">
                                            <MessageSquare size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                            <div>
                                                <span className="text-white/40 text-xs">Pitch Angle</span>
                                                <p className="text-white/80">{list.brief.pitchAngle}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Filter Bar */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                                    >
                                        <LayoutList size={14} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('cards')}
                                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                                    >
                                        <LayoutGrid size={14} />
                                    </button>
                                </div>

                                <select
                                    value={followerRange.label}
                                    onChange={(e) => setFollowerRange(FOLLOWER_RANGES.find(r => r.label === e.target.value) || FOLLOWER_RANGES[0])}
                                    className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 focus:outline-none focus:border-visio-teal/50"
                                >
                                    {FOLLOWER_RANGES.map(r => (
                                        <option key={r.label} value={r.label}>{r.label} followers</option>
                                    ))}
                                </select>

                                {countries.length > 1 && (
                                    <select
                                        value={countryFilter}
                                        onChange={(e) => setCountryFilter(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 focus:outline-none focus:border-visio-teal/50"
                                    >
                                        <option value="all">All countries</option>
                                        {countries.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                )}

                                <input
                                    type="text"
                                    placeholder="Search leads..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-visio-teal/50 flex-1 min-w-[120px]"
                                />

                                <span className="text-white/30 text-xs ml-auto">
                                    {filteredLeads.length} of {list.leads.length}
                                </span>
                            </div>

                            {/* Lead Content */}
                            {viewMode === 'table' ? (
                                <div className="overflow-x-auto rounded-xl border border-white/5">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10 text-left">
                                                <th className="px-3 py-2.5 text-white/40 font-medium text-xs">Name</th>
                                                <th className="px-3 py-2.5 text-white/40 font-medium text-xs">Title</th>
                                                <th className="px-3 py-2.5 text-white/40 font-medium text-xs">Company</th>
                                                <th className="px-3 py-2.5 text-white/40 font-medium text-xs">Email</th>
                                                <th className="px-3 py-2.5 text-white/40 font-medium text-xs">Followers</th>
                                                <th className="px-3 py-2.5 text-white/40 font-medium text-xs">Source</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredLeads.slice(0, 50).map((lead, i) => (
                                                <tr key={lead.id || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="px-3 py-2 text-white font-medium">{lead.name}</td>
                                                    <td className="px-3 py-2 text-white/60">{lead.title || '—'}</td>
                                                    <td className="px-3 py-2 text-white/60">{lead.company || '—'}</td>
                                                    <td className="px-3 py-2">
                                                        {lead.email ? (
                                                            <a href={`mailto:${lead.email}`} className="text-visio-teal hover:underline">{lead.email}</a>
                                                        ) : <span className="text-white/30">—</span>}
                                                    </td>
                                                    <td className="px-3 py-2 text-white/60">{lead.followers || '—'}</td>
                                                    <td className="px-3 py-2 text-white/40 text-xs">{lead.source || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {filteredLeads.length > 50 && (
                                        <div className="text-center py-2 text-white/30 text-xs">
                                            Showing 50 of {filteredLeads.length} leads
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {filteredLeads.slice(0, 30).map((lead, i) => (
                                        <div key={lead.id || i} className="bg-white/5 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors">
                                            <h4 className="text-white font-medium text-sm truncate">{lead.name}</h4>
                                            <p className="text-white/50 text-xs truncate">{lead.title}{lead.company ? ` at ${lead.company}` : ''}</p>
                                            {lead.email && <p className="text-visio-teal text-xs mt-1 truncate">{lead.email}</p>}
                                            <div className="flex items-center gap-2 mt-2">
                                                {lead.followers && <span className="text-white/30 text-xs">{lead.followers}</span>}
                                                {lead.source && <span className="text-white/20 text-xs">via {lead.source.split('(')[0].trim()}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
