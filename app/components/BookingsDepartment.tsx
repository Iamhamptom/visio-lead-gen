'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Globe, MapPin, Plus, Search, Filter, ChevronRight, Check, X, Loader2,
    Building2, Users, Calendar, Send, Mail, ArrowRight, BarChart3, Eye,
    MessageSquare, Star, Lock, Zap, RefreshCw, Trash2, ExternalLink
} from 'lucide-react';
import { BookingCampaign, BookingContact, BookingCampaignStatus, SubscriptionTier } from '../types';
import { supabase } from '@/lib/supabase/client';

interface BookingsDepartmentProps {
    subscriptionTier: SubscriptionTier;
    onUpgrade: () => void;
}

const STATUS_CONFIG: Record<BookingCampaignStatus, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: 'Draft', color: 'bg-white/10 text-white/60', icon: <Calendar size={12} /> },
    researching: { label: 'Researching', color: 'bg-amber-500/20 text-amber-400', icon: <Search size={12} /> },
    contacts_ready: { label: 'Contacts Ready', color: 'bg-cyan-500/20 text-cyan-400', icon: <Users size={12} /> },
    review: { label: 'In Review', color: 'bg-purple-500/20 text-purple-400', icon: <Eye size={12} /> },
    outreach_sent: { label: 'Outreach Sent', color: 'bg-blue-500/20 text-blue-400', icon: <Send size={12} /> },
    active: { label: 'Active', color: 'bg-green-500/20 text-green-400', icon: <Check size={12} /> },
    completed: { label: 'Completed', color: 'bg-white/10 text-white/40', icon: <Star size={12} /> },
};

const CONTACT_TYPE_LABELS: Record<string, string> = {
    venue: 'Venue', promoter: 'Promoter', agency: 'Agency',
    events_company: 'Events Co.', club: 'Club', festival: 'Festival'
};

const OUTREACH_STATUS_COLORS: Record<string, string> = {
    pending: 'bg-white/10 text-white/50',
    sent: 'bg-blue-500/20 text-blue-400',
    opened: 'bg-amber-500/20 text-amber-400',
    replied: 'bg-cyan-500/20 text-cyan-400',
    booked: 'bg-green-500/20 text-green-400',
    declined: 'bg-red-500/20 text-red-400',
};

export const BookingsDepartment: React.FC<BookingsDepartmentProps> = ({ subscriptionTier, onUpgrade }) => {
    const isVip = subscriptionTier === 'agency' || subscriptionTier === 'enterprise';

    const [campaigns, setCampaigns] = useState<BookingCampaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<BookingCampaign | null>(null);
    const [contacts, setContacts] = useState<BookingContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [showNewCampaign, setShowNewCampaign] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [error, setError] = useState<string | null>(null);

    // New campaign form
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newRegions, setNewRegions] = useState('');
    const [newGenres, setNewGenres] = useState('');
    const [newTourDates, setNewTourDates] = useState('');
    const [creating, setCreating] = useState(false);

    const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token
            ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
            : { 'Content-Type': 'application/json' };
    };

    // Load campaigns
    useEffect(() => {
        if (!isVip) { setLoading(false); return; }
        (async () => {
            try {
                const headers = await getAuthHeaders();
                const res = await fetch('/api/bookings', { headers });
                if (res.ok) {
                    const data = await res.json();
                    setCampaigns(data.campaigns || []);
                }
            } catch { /* ignore */ }
            setLoading(false);
        })();
    }, [isVip]);

    // Load contacts when campaign selected
    useEffect(() => {
        if (!selectedCampaign) { setContacts([]); return; }
        setContactsLoading(true);
        (async () => {
            try {
                const headers = await getAuthHeaders();
                const res = await fetch(`/api/bookings/${selectedCampaign.id}`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setContacts(data.contacts || []);
                }
            } catch { /* ignore */ }
            setContactsLoading(false);
        })();
    }, [selectedCampaign?.id]);

    const handleCreateCampaign = async () => {
        if (!newTitle.trim()) return;
        setCreating(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/bookings', {
                method: 'POST', headers,
                body: JSON.stringify({
                    title: newTitle.trim(),
                    description: newDescription.trim() || undefined,
                    targetRegions: newRegions.split(',').map(s => s.trim()).filter(Boolean),
                    genres: newGenres.split(',').map(s => s.trim()).filter(Boolean),
                    tourDates: newTourDates.trim() || undefined,
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setCampaigns(prev => [data.campaign, ...prev]);
            setShowNewCampaign(false);
            setNewTitle(''); setNewDescription(''); setNewRegions(''); setNewGenres(''); setNewTourDates('');
        } catch (e: any) {
            setError(e.message);
        }
        setCreating(false);
    };

    const handleDeleteCampaign = async (id: string) => {
        const headers = await getAuthHeaders();
        await fetch(`/api/bookings/${id}`, { method: 'DELETE', headers });
        setCampaigns(prev => prev.filter(c => c.id !== id));
        if (selectedCampaign?.id === id) setSelectedCampaign(null);
    };

    const handleUpdateOutreach = async (contactId: string, outreachStatus: string) => {
        if (!selectedCampaign) return;
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/bookings/${selectedCampaign.id}/contacts`, {
            method: 'PATCH', headers,
            body: JSON.stringify({ contactId, outreachStatus })
        });
        if (res.ok) {
            const data = await res.json();
            setContacts(prev => prev.map(c => c.id === contactId ? { ...c, ...data.contact } : c));
        }
    };

    const filteredContacts = useMemo(() => {
        let list = contacts;
        if (filterType !== 'all') list = list.filter(c => c.type === filterType);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.company.toLowerCase().includes(q) ||
                c.city.toLowerCase().includes(q) ||
                c.country.toLowerCase().includes(q)
            );
        }
        return list;
    }, [contacts, filterType, searchQuery]);

    // Stats
    const stats = useMemo(() => {
        const total = contacts.length;
        const sent = contacts.filter(c => c.outreach_status !== 'pending').length;
        const replied = contacts.filter(c => ['replied', 'booked'].includes(c.outreach_status)).length;
        const booked = contacts.filter(c => c.outreach_status === 'booked').length;
        return { total, sent, replied, booked, replyRate: sent ? Math.round((replied / sent) * 100) : 0 };
    }, [contacts]);

    // ─── VIP GATE ───
    if (!isVip) {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="max-w-lg text-center space-y-6">
                    <div className="w-20 h-20 mx-auto bg-white/5 rounded-3xl flex items-center justify-center border border-white/10">
                        <Lock size={36} className="text-visio-accent" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Bookings Department</h2>
                    <p className="text-white/50 text-lg leading-relaxed">
                        Plan tours, find venues & promoters worldwide, and launch outreach campaigns — all managed by V-Prai's team.
                    </p>
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-left space-y-3">
                        <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">What you get</h3>
                        {[
                            'AI-powered venue & promoter research across any region',
                            'Verified contact database with LinkedIn enrichment',
                            'Custom outreach email design by V-Prai team',
                            'Campaign dispatch & follow-up tracking',
                            'Real-time booking pipeline analytics',
                        ].map((f, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <Check size={14} className="text-green-400 mt-0.5 shrink-0" />
                                <span className="text-white/60 text-sm">{f}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={onUpgrade} className="px-8 py-4 bg-white text-black rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2 mx-auto">
                        <Zap size={18} /> Upgrade to Agency Elite
                    </button>
                    <p className="text-white/30 text-xs">Available on Agency (R4,499/mo) and Enterprise plans</p>
                </div>
            </div>
        );
    }

    // ─── MAIN UI ───
    return (
        <div className="h-full overflow-y-auto bg-[#0A0A0A]">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-visio-accent/10">
                            <Globe size={20} className="text-visio-accent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Bookings Department</h1>
                            <p className="text-xs text-white/40">Tour planning &middot; Venue research &middot; Promoter outreach</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowNewCampaign(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-sm font-bold hover:scale-105 transition-transform"
                    >
                        <Plus size={16} /> New Campaign
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                        <X size={14} /> {error}
                        <button onClick={() => setError(null)} className="ml-auto text-red-400/50 hover:text-red-400"><X size={14} /></button>
                    </div>
                )}

                {/* New Campaign Modal */}
                {showNewCampaign && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                        <h3 className="text-lg font-bold text-white">Create Booking Campaign</h3>
                        <p className="text-sm text-white/40">Tell us where you're going and we'll find every venue, promoter, and events company in that region.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-xs text-white/50 uppercase tracking-wider">Campaign Title *</label>
                                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g., UK Tour 2026 — Venue & Promoter Outreach"
                                    className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-visio-accent/50" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-white/50 uppercase tracking-wider">Description</label>
                                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="What's the goal? Tour dates, target audience, special requirements..."
                                    rows={2} className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-visio-accent/50 resize-none" />
                            </div>
                            <div>
                                <label className="text-xs text-white/50 uppercase tracking-wider">Target Regions (comma-separated)</label>
                                <input value={newRegions} onChange={e => setNewRegions(e.target.value)} placeholder="UK, London, Manchester, Birmingham"
                                    className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-visio-accent/50" />
                            </div>
                            <div>
                                <label className="text-xs text-white/50 uppercase tracking-wider">Genres (comma-separated)</label>
                                <input value={newGenres} onChange={e => setNewGenres(e.target.value)} placeholder="Dancehall, Afrobeats, Amapiano"
                                    className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-visio-accent/50" />
                            </div>
                            <div>
                                <label className="text-xs text-white/50 uppercase tracking-wider">Tour Dates (optional)</label>
                                <input value={newTourDates} onChange={e => setNewTourDates(e.target.value)} placeholder="June 15 - July 10, 2026"
                                    className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-visio-accent/50" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleCreateCampaign} disabled={creating || !newTitle.trim()}
                                className="px-6 py-2.5 bg-white text-black rounded-xl text-sm font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2">
                                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Create Campaign
                            </button>
                            <button onClick={() => setShowNewCampaign(false)} className="px-6 py-2.5 bg-white/5 text-white/60 rounded-xl text-sm hover:text-white transition-colors">
                                Cancel
                            </button>
                        </div>
                        <p className="text-xs text-white/30">After creation, V-Prai's team will research and populate your contact list. You'll be notified when it's ready for review.</p>
                    </div>
                )}

                {/* Campaign List or Campaign Detail */}
                {selectedCampaign ? (
                    // ─── CAMPAIGN DETAIL VIEW ───
                    <div className="space-y-6">
                        <button onClick={() => setSelectedCampaign(null)} className="text-sm text-white/40 hover:text-white flex items-center gap-1">
                            ← Back to campaigns
                        </button>

                        {/* Campaign Header */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{selectedCampaign.title}</h2>
                                    {selectedCampaign.description && <p className="text-sm text-white/40 mt-1">{selectedCampaign.description}</p>}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {selectedCampaign.target_regions?.map((r: string) => (
                                            <span key={r} className="px-2 py-1 bg-visio-accent/10 text-visio-accent text-xs rounded-lg flex items-center gap-1">
                                                <MapPin size={10} /> {r}
                                            </span>
                                        ))}
                                        {selectedCampaign.genres?.map((g: string) => (
                                            <span key={g} className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-lg">{g}</span>
                                        ))}
                                    </div>
                                </div>
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${STATUS_CONFIG[selectedCampaign.status as BookingCampaignStatus]?.color || 'bg-white/10 text-white/50'}`}>
                                    {STATUS_CONFIG[selectedCampaign.status as BookingCampaignStatus]?.icon}
                                    {STATUS_CONFIG[selectedCampaign.status as BookingCampaignStatus]?.label || selectedCampaign.status}
                                </span>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {[
                                    { label: 'Total Contacts', value: stats.total, icon: <Users size={14} />, color: 'text-white' },
                                    { label: 'Outreach Sent', value: stats.sent, icon: <Send size={14} />, color: 'text-blue-400' },
                                    { label: 'Replies', value: stats.replied, icon: <MessageSquare size={14} />, color: 'text-cyan-400' },
                                    { label: 'Booked', value: stats.booked, icon: <Star size={14} />, color: 'text-green-400' },
                                    { label: 'Reply Rate', value: `${stats.replyRate}%`, icon: <BarChart3 size={14} />, color: 'text-amber-400' },
                                ].map((s, i) => (
                                    <div key={i} className="bg-white/5 rounded-xl p-3 text-center">
                                        <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                                        <div className="text-[10px] text-white/40 uppercase tracking-wider flex items-center justify-center gap-1 mt-1">{s.icon} {s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Contact Filters */}
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search contacts..."
                                    className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-visio-accent/50" />
                            </div>
                            <div className="flex gap-1.5">
                                {['all', 'venue', 'promoter', 'agency', 'club', 'festival', 'events_company'].map(t => (
                                    <button key={t} onClick={() => setFilterType(t)}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterType === t ? 'bg-visio-accent/20 text-visio-accent' : 'bg-white/5 text-white/40 hover:text-white/60'}`}>
                                        {t === 'all' ? 'All' : CONTACT_TYPE_LABELS[t] || t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Contacts Table */}
                        {contactsLoading ? (
                            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-white/30" /></div>
                        ) : filteredContacts.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <Building2 size={48} className="text-white/10 mx-auto" />
                                <p className="text-white/40">No contacts yet</p>
                                <p className="text-white/20 text-sm">V-Prai's team will research and populate contacts for this campaign.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredContacts.map(contact => (
                                    <div key={contact.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-sm font-bold text-white truncate">{contact.name}</h4>
                                                    {contact.verified && <Check size={12} className="text-green-400 shrink-0" />}
                                                    <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-white/40 uppercase">{CONTACT_TYPE_LABELS[contact.type] || contact.type}</span>
                                                </div>
                                                <p className="text-xs text-white/50">{contact.company}{contact.role !== 'Contact' ? ` · ${contact.role}` : ''}</p>
                                                <div className="flex flex-wrap gap-3 mt-2 text-xs text-white/30">
                                                    {contact.city && <span className="flex items-center gap-1"><MapPin size={10} />{contact.city}, {contact.country}</span>}
                                                    {contact.email && <span className="flex items-center gap-1"><Mail size={10} />{contact.email}</span>}
                                                    {contact.website && <a href={contact.website} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-white/50"><ExternalLink size={10} />Website</a>}
                                                    {contact.capacity && <span>{contact.capacity.toLocaleString()} cap.</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <select
                                                    value={contact.outreach_status}
                                                    onChange={e => handleUpdateOutreach(contact.id, e.target.value)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border-0 cursor-pointer ${OUTREACH_STATUS_COLORS[contact.outreach_status] || 'bg-white/10 text-white/50'}`}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="sent">Sent</option>
                                                    <option value="opened">Opened</option>
                                                    <option value="replied">Replied</option>
                                                    <option value="booked">Booked!</option>
                                                    <option value="declined">Declined</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    // ─── CAMPAIGN LIST VIEW ───
                    loading ? (
                        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-white/30" /></div>
                    ) : campaigns.length === 0 ? (
                        <div className="text-center py-20 space-y-4">
                            <Globe size={64} className="text-white/10 mx-auto" />
                            <h2 className="text-2xl font-bold text-white">No booking campaigns yet</h2>
                            <p className="text-white/40 max-w-md mx-auto">
                                Create your first campaign to start finding venues, promoters, and events companies in any region worldwide.
                            </p>
                            <button onClick={() => setShowNewCampaign(true)}
                                className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:scale-105 transition-transform inline-flex items-center gap-2">
                                <Plus size={16} /> Create Your First Campaign
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {campaigns.map(campaign => (
                                <div key={campaign.id}
                                    onClick={() => setSelectedCampaign(campaign)}
                                    className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-white/15 transition-all cursor-pointer group">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-base font-bold text-white group-hover:text-visio-accent transition-colors pr-2">{campaign.title}</h3>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-medium shrink-0 flex items-center gap-1 ${STATUS_CONFIG[campaign.status as BookingCampaignStatus]?.color || 'bg-white/10 text-white/50'}`}>
                                            {STATUS_CONFIG[campaign.status as BookingCampaignStatus]?.icon}
                                            {STATUS_CONFIG[campaign.status as BookingCampaignStatus]?.label || campaign.status}
                                        </span>
                                    </div>
                                    {campaign.description && <p className="text-xs text-white/30 mb-3 line-clamp-2">{campaign.description}</p>}
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {campaign.target_regions?.slice(0, 4).map((r: string) => (
                                            <span key={r} className="px-1.5 py-0.5 bg-visio-accent/10 text-visio-accent text-[10px] rounded">{r}</span>
                                        ))}
                                        {(campaign.target_regions?.length || 0) > 4 && (
                                            <span className="px-1.5 py-0.5 bg-white/5 text-white/30 text-[10px] rounded">+{campaign.target_regions.length - 4}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                        <div className="flex gap-4 text-xs text-white/40">
                                            <span className="flex items-center gap-1"><Users size={10} /> {campaign.contact_count} contacts</span>
                                            <span className="flex items-center gap-1"><Send size={10} /> {campaign.sent_count} sent</span>
                                            <span className="flex items-center gap-1"><Star size={10} /> {campaign.booked_count} booked</span>
                                        </div>
                                        <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
                                    </div>
                                    <div className="flex justify-end mt-2">
                                        <button onClick={e => { e.stopPropagation(); handleDeleteCampaign(campaign.id); }}
                                            className="text-white/10 hover:text-red-400 transition-colors p-1"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
