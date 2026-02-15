'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    Users,
    Instagram,
    Twitter,
    Music,
    Filter,
    ExternalLink,
    Verified,
    ChevronDown,
    Store,
    Globe,
    Coins,
    Mail,
    Target,
    BarChart3,
    FileText,
    TrendingUp,
    Sparkles
} from 'lucide-react';
import { SubscriptionTier } from '../types';

interface MarketplaceContact {
    id: string;
    person: string;
    company: string;
    title: string;
    email: string;
    country: string;
    industry: string;
    source: string;
    dateAdded: string;
    followers: string;
    instagram: string;
    tiktok: string;
    twitter: string;
    status: string;
}

interface MarketplaceProps {
    onNewChat: () => void;
    subscriptionTier?: SubscriptionTier;
}

const AI_TOOLS = [
    { icon: Search, name: 'Lead Finder', description: 'Find curators, bloggers, journalists & DJs', credits: 2, color: 'text-visio-teal', bg: 'bg-visio-teal/10' },
    { icon: Mail, name: 'Pitch Drafter', description: 'AI-powered pitch emails for any campaign', credits: 1, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: Target, name: 'Campaign Planner', description: 'Full release campaign with timeline & budget', credits: 3, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { icon: BarChart3, name: 'Competitor Intel', description: 'Research competitor strategies & positioning', credits: 3, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { icon: FileText, name: 'Press Release', description: 'Generate industry-ready press releases', credits: 1, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { icon: TrendingUp, name: 'Viral Research', description: 'Discover trending content & viral patterns', credits: 3, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { icon: Sparkles, name: 'Social Pack', description: 'Full social media content kit for releases', credits: 1, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { icon: Globe, name: 'Market Research', description: 'Deep market analysis for your genre & region', credits: 3, color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

const ITEMS_PER_PAGE = 30;

export const Marketplace: React.FC<MarketplaceProps> = ({
    onNewChat,
    subscriptionTier = 'artist',
}) => {
    const [contacts, setContacts] = useState<MarketplaceContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndustry, setSelectedIndustry] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const [activeTab, setActiveTab] = useState<'pages' | 'tools'>('pages');

    // Load contacts on mount
    React.useEffect(() => {
        fetch('/data/db_ZA.json')
            .then(res => res.json())
            .then(data => {
                setContacts(data || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Get unique industries
    const industries = useMemo(() => {
        const set = new Set<string>();
        contacts.forEach(c => { if (c.industry) set.add(c.industry); });
        return Array.from(set).sort();
    }, [contacts]);

    // Filter contacts
    const filtered = useMemo(() => {
        let result = contacts;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.person?.toLowerCase().includes(q) ||
                c.company?.toLowerCase().includes(q) ||
                c.industry?.toLowerCase().includes(q) ||
                c.instagram?.toLowerCase().includes(q) ||
                c.twitter?.toLowerCase().includes(q)
            );
        }
        if (selectedIndustry !== 'all') {
            result = result.filter(c => c.industry === selectedIndustry);
        }
        return result;
    }, [contacts, searchQuery, selectedIndustry]);

    const visibleContacts = filtered.slice(0, visibleCount);

    const parseFollowers = (f: string): string => {
        if (!f) return '—';
        return f;
    };

    return (
        <div className="flex-1 h-full overflow-y-auto p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Store size={28} className="text-visio-teal" />
                    <h1 className="text-3xl font-outfit font-bold text-white">Marketplace</h1>
                    <span className="text-xs bg-visio-teal/10 text-visio-teal px-3 py-1 rounded-full border border-visio-teal/20 font-medium">
                        {contacts.length} Pages & Tools
                    </span>
                </div>
                <p className="text-white/40">Browse curated industry contacts, AI tools, and resources for your campaigns.</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 w-fit border border-white/5">
                <button
                    onClick={() => setActiveTab('pages')}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'pages' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
                >
                    <span className="flex items-center gap-2">
                        <Users size={14} />
                        Pages & Contacts ({contacts.length})
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('tools')}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'tools' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
                >
                    <span className="flex items-center gap-2">
                        <Sparkles size={14} />
                        AI Tools ({AI_TOOLS.length})
                    </span>
                </button>
            </div>

            {activeTab === 'tools' ? (
                /* AI Tools Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {AI_TOOLS.map((tool, i) => (
                        <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.03 * i }}
                            onClick={onNewChat}
                            className="flex flex-col p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/10 transition-all text-left group"
                        >
                            <div className="flex items-center justify-between w-full mb-3">
                                <div className={`p-2.5 rounded-xl ${tool.bg}`}>
                                    <tool.icon size={20} className={tool.color} />
                                </div>
                                <span className="text-[10px] text-white/30 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full">
                                    <Coins size={10} />{tool.credits} cr
                                </span>
                            </div>
                            <h4 className="text-sm font-bold text-white group-hover:text-visio-teal transition-colors mb-1">{tool.name}</h4>
                            <p className="text-xs text-white/40">{tool.description}</p>
                        </motion.button>
                    ))}
                </div>
            ) : (
                /* Pages & Contacts */
                <>
                    {/* Search & Filters */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                type="text"
                                placeholder="Search pages, contacts, genres..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
                                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-visio-teal/50 transition-colors"
                            />
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white text-sm transition-colors"
                            >
                                <Filter size={14} />
                                {selectedIndustry === 'all' ? 'All Industries' : selectedIndustry}
                                <ChevronDown size={14} />
                            </button>
                            {showFilters && (
                                <div className="absolute top-full mt-1 right-0 w-64 max-h-72 overflow-y-auto bg-[#111] border border-white/10 rounded-xl shadow-2xl z-50 p-1">
                                    <button
                                        onClick={() => { setSelectedIndustry('all'); setShowFilters(false); setVisibleCount(ITEMS_PER_PAGE); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${selectedIndustry === 'all' ? 'bg-visio-teal/10 text-visio-teal' : 'text-white/60 hover:bg-white/5'}`}
                                    >
                                        All Industries ({contacts.length})
                                    </button>
                                    {industries.map(ind => {
                                        const count = contacts.filter(c => c.industry === ind).length;
                                        return (
                                            <button
                                                key={ind}
                                                onClick={() => { setSelectedIndustry(ind); setShowFilters(false); setVisibleCount(ITEMS_PER_PAGE); }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${selectedIndustry === ind ? 'bg-visio-teal/10 text-visio-teal' : 'text-white/60 hover:bg-white/5'}`}
                                            >
                                                {ind} ({count})
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Results count */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-white/30">{filtered.length} results</p>
                    </div>

                    {/* Contacts Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[...Array(9)].map((_, i) => (
                                <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-12 text-center">
                            <Users size={40} className="text-white/10 mx-auto mb-3" />
                            <p className="text-white/40 text-sm">No results found. Try a different search or filter.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {visibleContacts.map((contact, i) => (
                                    <motion.div
                                        key={contact.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(i * 0.02, 0.5) }}
                                        className="bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:bg-white/[0.06] hover:border-white/10 transition-all group"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-visio-teal/20 to-visio-sage/20 flex items-center justify-center text-visio-teal font-bold text-xs shrink-0">
                                                    {contact.person?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <h4 className="text-sm font-semibold text-white truncate">{contact.person}</h4>
                                                        {contact.status === 'Verified' && (
                                                            <Verified size={12} className="text-visio-teal shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-white/30 truncate">{contact.company}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 shrink-0 ml-1">
                                                {parseFollowers(contact.followers)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-visio-teal/10 text-visio-teal border border-visio-teal/20">
                                                {contact.industry || contact.title}
                                            </span>
                                            {contact.country && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/30">
                                                    {contact.country}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {contact.instagram && (
                                                <span className="text-[10px] text-white/30 flex items-center gap-1">
                                                    <Instagram size={10} /> {contact.instagram}
                                                </span>
                                            )}
                                            {contact.twitter && (
                                                <span className="text-[10px] text-white/30 flex items-center gap-1">
                                                    <Twitter size={10} /> {contact.twitter}
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Load More */}
                            {visibleCount < filtered.length && (
                                <div className="flex justify-center pt-4">
                                    <button
                                        onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                                        className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        Load more ({filtered.length - visibleCount} remaining)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};
