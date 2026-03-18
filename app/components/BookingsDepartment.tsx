'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Globe, MapPin, Plus, Search, ChevronRight, Check, X, Loader2,
    Building2, Users, Calendar, Send, Mail, ArrowRight, BarChart3, Eye,
    MessageSquare, Star, Lock, Zap, Trash2, ExternalLink, Download,
    ArrowLeft, Copy, Pencil, Phone, Linkedin, ChevronDown, Sparkles,
    Target, TrendingUp, Clock, CheckCircle2, FileText, Rocket
} from 'lucide-react';
import { BookingCampaignStatus, SubscriptionTier } from '../types';
import { supabase } from '@/lib/supabase/client';

// ─── DB ROW TYPES (snake_case from Supabase) ───
interface CampaignRow {
    id: string; user_id: string; title: string; description?: string;
    target_regions: string[]; target_types: string[]; genres: string[];
    tour_dates?: string; status: string; contact_count: number;
    sent_count: number; replied_count: number; booked_count: number;
    outreach_email_subject?: string; outreach_email_body?: string;
    approved_by_admin: boolean; approved_at?: string;
    created_at: string; updated_at: string;
}

interface ContactRow {
    id: string; campaign_id: string; name: string; email?: string;
    phone?: string; company: string; role: string; type: string;
    city: string; country: string; region?: string; website?: string;
    linkedin?: string; capacity?: number; genres: string[];
    verified: boolean; notes?: string; outreach_status: string;
    last_contacted_at?: string; created_at: string;
}

interface CampaignTemplate {
    id: string; title: string; description: string; targetRegions: string[];
    targetTypes: string[]; icon: string; estimatedContacts: string; category: string;
}

interface Props {
    subscriptionTier: SubscriptionTier;
    onUpgrade: () => void;
}

// ─── CONSTANTS ───
const STATUS_FLOW: { key: BookingCampaignStatus; label: string; color: string; icon: React.ReactNode }[] = [
    { key: 'draft', label: 'Draft', color: 'bg-zinc-500/20 text-zinc-400', icon: <FileText size={12} /> },
    { key: 'researching', label: 'Researching', color: 'bg-amber-500/20 text-amber-400', icon: <Search size={12} /> },
    { key: 'contacts_ready', label: 'Contacts Ready', color: 'bg-cyan-500/20 text-cyan-400', icon: <Users size={12} /> },
    { key: 'review', label: 'In Review', color: 'bg-purple-500/20 text-purple-400', icon: <Eye size={12} /> },
    { key: 'outreach_sent', label: 'Outreach Live', color: 'bg-blue-500/20 text-blue-400', icon: <Send size={12} /> },
    { key: 'active', label: 'Active', color: 'bg-green-500/20 text-green-400', icon: <CheckCircle2 size={12} /> },
    { key: 'completed', label: 'Completed', color: 'bg-zinc-500/20 text-zinc-500', icon: <Star size={12} /> },
];

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
    venue: { label: 'Venue', color: 'bg-blue-500/15 text-blue-400' },
    promoter: { label: 'Promoter', color: 'bg-purple-500/15 text-purple-400' },
    agency: { label: 'Agency', color: 'bg-cyan-500/15 text-cyan-400' },
    events_company: { label: 'Events Co.', color: 'bg-amber-500/15 text-amber-400' },
    club: { label: 'Club', color: 'bg-pink-500/15 text-pink-400' },
    festival: { label: 'Festival', color: 'bg-green-500/15 text-green-400' },
};

const OUTREACH_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'Pending', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
    sent: { label: 'Sent', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    opened: { label: 'Opened', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    replied: { label: 'Replied', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    booked: { label: 'Booked', color: 'text-green-400', bg: 'bg-green-500/10' },
    declined: { label: 'Declined', color: 'text-red-400', bg: 'bg-red-500/10' },
};

export const BookingsDepartment: React.FC<Props> = ({ subscriptionTier, onUpgrade }) => {
    const isVip = subscriptionTier === 'agency' || subscriptionTier === 'enterprise';

    // State
    const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<CampaignRow | null>(null);
    const [contacts, setContacts] = useState<ContactRow[]>([]);
    const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [view, setView] = useState<'list' | 'templates' | 'detail' | 'email'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [detailTab, setDetailTab] = useState<'contacts' | 'email' | 'analytics'>('contacts');

    // New campaign form
    const [showNewForm, setShowNewForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newRegions, setNewRegions] = useState('');
    const [newGenres, setNewGenres] = useState('');
    const [newDates, setNewDates] = useState('');
    const [creating, setCreating] = useState(false);

    // Email editor
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [savingEmail, setSavingEmail] = useState(false);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    const getHeaders = useCallback(async (): Promise<Record<string, string>> => {
        const { data: { session } } = await supabase.auth.getSession();
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
        return h;
    }, []);

    // ─── DATA LOADING ───
    useEffect(() => {
        if (!isVip) { setLoading(false); return; }
        (async () => {
            const headers = await getHeaders();
            const [campRes, tmplRes] = await Promise.all([
                fetch('/api/bookings', { headers }).then(r => r.ok ? r.json() : { campaigns: [] }),
                fetch('/api/bookings/templates').then(r => r.ok ? r.json() : { templates: [] }),
            ]);
            setCampaigns(campRes.campaigns || []);
            setTemplates(tmplRes.templates || []);
            setLoading(false);
        })();
    }, [isVip, getHeaders]);

    useEffect(() => {
        if (!selectedCampaign) return;
        setContactsLoading(true);
        (async () => {
            const headers = await getHeaders();
            const res = await fetch(`/api/bookings/${selectedCampaign.id}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setContacts(data.contacts || []);
                // Sync email fields
                setEmailSubject(data.campaign?.outreach_email_subject || '');
                setEmailBody(data.campaign?.outreach_email_body || '');
            }
            setContactsLoading(false);
        })();
    }, [selectedCampaign?.id, getHeaders]);

    // ─── ACTIONS ───
    const createCampaign = async (overrides?: Partial<{ title: string; description: string; regions: string[]; genres: string[] }>) => {
        const title = overrides?.title || newTitle.trim();
        if (!title) return;
        setCreating(true); setError(null);
        try {
            const headers = await getHeaders();
            const res = await fetch('/api/bookings', {
                method: 'POST', headers,
                body: JSON.stringify({
                    title,
                    description: overrides?.description || newDesc.trim() || undefined,
                    targetRegions: overrides?.regions || newRegions.split(',').map(s => s.trim()).filter(Boolean),
                    genres: overrides?.genres || newGenres.split(',').map(s => s.trim()).filter(Boolean),
                    tourDates: newDates.trim() || undefined,
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setCampaigns(prev => [data.campaign, ...prev]);
            setShowNewForm(false); setView('list');
            setNewTitle(''); setNewDesc(''); setNewRegions(''); setNewGenres(''); setNewDates('');
            showToast('Campaign created — V-Prai team will start researching contacts');
        } catch (e: any) { setError(e.message); }
        setCreating(false);
    };

    const deleteCampaign = async (id: string) => {
        const headers = await getHeaders();
        await fetch(`/api/bookings/${id}`, { method: 'DELETE', headers });
        setCampaigns(prev => prev.filter(c => c.id !== id));
        if (selectedCampaign?.id === id) { setSelectedCampaign(null); setView('list'); }
        showToast('Campaign deleted');
    };

    const updateOutreach = async (contactId: string, outreachStatus: string) => {
        if (!selectedCampaign) return;
        const headers = await getHeaders();
        const res = await fetch(`/api/bookings/${selectedCampaign.id}/contacts`, {
            method: 'PATCH', headers,
            body: JSON.stringify({ contactId, outreachStatus })
        });
        if (res.ok) {
            setContacts(prev => prev.map(c => c.id === contactId ? { ...c, outreach_status: outreachStatus } : c));
        }
    };

    const saveEmailTemplate = async () => {
        if (!selectedCampaign) return;
        setSavingEmail(true);
        const headers = await getHeaders();
        await fetch(`/api/bookings/${selectedCampaign.id}`, {
            method: 'PATCH', headers,
            body: JSON.stringify({ outreach_email_subject: emailSubject, outreach_email_body: emailBody })
        });
        setSavingEmail(false);
        showToast('Email template saved');
    };

    const exportCSV = async () => {
        if (!selectedCampaign) return;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch(`/api/bookings/${selectedCampaign.id}/export`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) { showToast('Export failed'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${selectedCampaign.title.replace(/\s+/g, '_')}_contacts.csv`;
        a.click(); URL.revokeObjectURL(url);
        showToast('CSV downloaded');
    };

    const openCampaign = (campaign: CampaignRow) => {
        setSelectedCampaign(campaign);
        setDetailTab('contacts');
        setView('detail');
    };

    // ─── COMPUTED ───
    const filteredContacts = useMemo(() => {
        let list = contacts;
        if (filterType !== 'all') list = list.filter(c => c.type === filterType);
        if (filterStatus !== 'all') list = list.filter(c => c.outreach_status === filterStatus);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c =>
                c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) ||
                c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [contacts, filterType, filterStatus, searchQuery]);

    const pipeline = useMemo(() => {
        const p = { pending: 0, sent: 0, opened: 0, replied: 0, booked: 0, declined: 0 };
        contacts.forEach(c => { if (c.outreach_status in p) (p as any)[c.outreach_status]++; });
        return p;
    }, [contacts]);

    const stats = useMemo(() => {
        const total = contacts.length;
        const verified = contacts.filter(c => c.verified).length;
        const withEmail = contacts.filter(c => c.email).length;
        const sent = pipeline.sent + pipeline.opened + pipeline.replied + pipeline.booked + pipeline.declined;
        const engaged = pipeline.replied + pipeline.booked;
        const replyRate = sent > 0 ? Math.round((engaged / sent) * 100) : 0;
        const bookRate = sent > 0 ? Math.round((pipeline.booked / sent) * 100) : 0;
        return { total, verified, withEmail, sent, engaged, replyRate, bookRate };
    }, [contacts, pipeline]);

    const statusIdx = STATUS_FLOW.findIndex(s => s.key === selectedCampaign?.status);

    // ═══════════════════════════════════════════════════════════════
    // VIP GATE
    // ═══════════════════════════════════════════════════════════════
    if (!isVip) {
        return (
            <div className="h-full flex items-center justify-center p-8 bg-[#0A0A0A]">
                <div className="max-w-2xl text-center space-y-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-visio-accent/5 rounded-full blur-[100px]" />
                        <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-white/10 to-white/5 rounded-3xl flex items-center justify-center border border-white/10">
                            <Globe size={40} className="text-visio-accent" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-4xl font-bold text-white mb-3">Bookings Department</h2>
                        <p className="text-white/40 text-lg max-w-lg mx-auto">
                            Plan tours, find every venue & promoter worldwide, and launch managed outreach campaigns — all handled by V-Prai's team.
                        </p>
                    </div>

                    {/* How it works */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                        {[
                            { icon: <Target size={20} />, title: 'You Pick a Region', desc: 'Tell us where you\'re going — UK, Africa, Caribbean, anywhere. We research every contact.' },
                            { icon: <Users size={20} />, title: 'We Build Your List', desc: 'Venues, promoters, agencies, clubs, festivals — verified with email, LinkedIn, and enriched data.' },
                            { icon: <Rocket size={20} />, title: 'We Launch Outreach', desc: 'Custom email designed for you, dispatched to your list. You track replies and book shows.' },
                        ].map((step, i) => (
                            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-visio-accent/10 flex items-center justify-center text-visio-accent">{step.icon}</div>
                                <h3 className="text-sm font-bold text-white">{step.title}</h3>
                                <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5">
                        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-4">Included in your plan</h3>
                        <div className="grid grid-cols-2 gap-3 text-left">
                            {[
                                'AI-powered contact research', 'Email + LinkedIn enrichment',
                                'Custom outreach email design', 'Campaign dispatch & tracking',
                                'CSV export of all contacts', 'Pipeline analytics & reply rates',
                                'Tour calendar integration', 'Unlimited campaigns',
                            ].map((f, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <CheckCircle2 size={12} className="text-green-400 shrink-0" />
                                    <span className="text-white/50 text-xs">{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={onUpgrade} className="px-10 py-4 bg-white text-black rounded-2xl font-bold text-lg hover:scale-105 transition-transform flex items-center gap-3 mx-auto shadow-2xl shadow-white/10">
                        <Zap size={20} /> Upgrade to Agency Elite — R4,499/mo
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // MAIN UI
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="h-full overflow-y-auto bg-[#0A0A0A]">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2 animate-in slide-in-from-top fade-in">
                    <CheckCircle2 size={14} /> {toast}
                </div>
            )}

            {/* ─── HEADER ─── */}
            <div className="sticky top-0 z-20 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/5">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {view === 'detail' && (
                            <button onClick={() => { setView('list'); setSelectedCampaign(null); }} className="p-2 -ml-2 hover:bg-white/5 rounded-xl transition-colors">
                                <ArrowLeft size={18} className="text-white/40" />
                            </button>
                        )}
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-visio-accent/20 to-visio-accent/5 border border-visio-accent/10">
                            <Globe size={20} className="text-visio-accent" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">
                                {view === 'detail' ? selectedCampaign?.title : view === 'templates' ? 'Campaign Templates' : 'Bookings Department'}
                            </h1>
                            <p className="text-[11px] text-white/30">
                                {view === 'detail' ? `${contacts.length} contacts · ${selectedCampaign?.target_regions?.join(', ')}` : 'Tour planning · Venue research · Promoter outreach'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {view === 'list' && (
                            <>
                                <button onClick={() => setView('templates')} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5">
                                    <Sparkles size={13} /> Templates
                                </button>
                                <button onClick={() => setShowNewForm(true)} className="px-4 py-2 bg-white text-black rounded-xl text-xs font-bold hover:scale-105 transition-transform flex items-center gap-1.5">
                                    <Plus size={14} /> New Campaign
                                </button>
                            </>
                        )}
                        {view === 'templates' && (
                            <button onClick={() => setView('list')} className="px-3 py-2 bg-white/5 text-white/60 rounded-xl text-xs hover:text-white transition-colors">
                                ← Back
                            </button>
                        )}
                        {view === 'detail' && (
                            <div className="flex gap-2">
                                <button onClick={exportCSV} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5">
                                    <Download size={13} /> Export CSV
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Detail Tabs */}
                {view === 'detail' && (
                    <div className="px-6 flex gap-1 border-t border-white/[0.03]">
                        {(['contacts', 'email', 'analytics'] as const).map(tab => (
                            <button key={tab} onClick={() => setDetailTab(tab)}
                                className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors capitalize ${
                                    detailTab === tab ? 'border-visio-accent text-white' : 'border-transparent text-white/30 hover:text-white/60'
                                }`}>
                                {tab === 'contacts' ? `Contacts (${contacts.length})` : tab === 'email' ? 'Outreach Email' : 'Analytics'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {error && (
                <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <X size={14} /> {error} <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
                </div>
            )}

            <div className="p-6">
                {/* ═══ TEMPLATE PICKER ═══ */}
                {view === 'templates' && (
                    <div className="space-y-6">
                        <p className="text-sm text-white/40">Choose a pre-built campaign template or create your own. V-Prai's team will research and populate contacts for your target regions.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map(tmpl => (
                                <div key={tmpl.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-visio-accent/20 transition-all cursor-pointer group"
                                    onClick={() => {
                                        if (tmpl.id === 'custom') { setView('list'); setShowNewForm(true); return; }
                                        setNewTitle(tmpl.title); setNewDesc(tmpl.description);
                                        setNewRegions(tmpl.targetRegions.join(', '));
                                        setShowNewForm(true); setView('list');
                                    }}>
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-2xl">{tmpl.icon}</span>
                                        <span className="px-2 py-0.5 bg-white/5 rounded-lg text-[10px] text-white/30 uppercase tracking-wider">{tmpl.category}</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-white group-hover:text-visio-accent transition-colors mb-1">{tmpl.title}</h3>
                                    <p className="text-[11px] text-white/30 leading-relaxed mb-3">{tmpl.description}</p>
                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                        <span className="text-[10px] text-white/20">{tmpl.estimatedContacts} contacts</span>
                                        <ArrowRight size={12} className="text-white/10 group-hover:text-visio-accent transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══ NEW CAMPAIGN FORM ═══ */}
                {showNewForm && view === 'list' && (
                    <div className="mb-6 bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2"><Rocket size={16} className="text-visio-accent" /> Create Campaign</h3>
                            <button onClick={() => { setShowNewForm(false); setNewTitle(''); setNewDesc(''); setNewRegions(''); setNewGenres(''); setNewDates(''); }}
                                className="p-1 text-white/20 hover:text-white/50"><X size={16} /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Campaign Title *</label>
                                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g., UK Tour 2026 — Venue & Promoter Outreach"
                                    className="w-full mt-1.5 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/15 focus:outline-none focus:border-visio-accent/40 transition-colors" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Description</label>
                                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Goal, target audience, special requirements..." rows={2}
                                    className="w-full mt-1.5 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/15 focus:outline-none focus:border-visio-accent/40 resize-none transition-colors" />
                            </div>
                            <div>
                                <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Target Regions</label>
                                <input value={newRegions} onChange={e => setNewRegions(e.target.value)} placeholder="UK, London, Manchester..."
                                    className="w-full mt-1.5 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/15 focus:outline-none focus:border-visio-accent/40 transition-colors" />
                            </div>
                            <div>
                                <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Genres</label>
                                <input value={newGenres} onChange={e => setNewGenres(e.target.value)} placeholder="Dancehall, Afrobeats..."
                                    className="w-full mt-1.5 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/15 focus:outline-none focus:border-visio-accent/40 transition-colors" />
                            </div>
                            <div>
                                <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Tour Dates (optional)</label>
                                <input value={newDates} onChange={e => setNewDates(e.target.value)} placeholder="June 15 - July 10, 2026"
                                    className="w-full mt-1.5 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/15 focus:outline-none focus:border-visio-accent/40 transition-colors" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <button onClick={() => createCampaign()} disabled={creating || !newTitle.trim()}
                                className="px-6 py-2.5 bg-white text-black rounded-xl text-sm font-bold hover:scale-105 transition-transform disabled:opacity-40 flex items-center gap-2">
                                {creating ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />} Launch Campaign
                            </button>
                            <span className="text-[11px] text-white/20">V-Prai's team will start researching contacts immediately</span>
                        </div>
                    </div>
                )}

                {/* ═══ CAMPAIGN LIST ═══ */}
                {view === 'list' && !loading && (
                    campaigns.length === 0 && !showNewForm ? (
                        <div className="text-center py-24 space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-visio-accent/5 rounded-full blur-[80px]" />
                                <Globe size={64} className="text-white/[0.06] mx-auto relative" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Launch your first booking campaign</h2>
                            <p className="text-white/30 max-w-md mx-auto text-sm">Pick a template or create from scratch. We'll research every venue, promoter, and events company in your target region.</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setView('templates')} className="px-5 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2">
                                    <Sparkles size={14} /> Browse Templates
                                </button>
                                <button onClick={() => setShowNewForm(true)} className="px-5 py-3 bg-white text-black rounded-xl text-sm font-bold hover:scale-105 transition-transform flex items-center gap-2">
                                    <Plus size={14} /> Create Campaign
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {campaigns.map(camp => {
                                const s = STATUS_FLOW.find(sf => sf.key === camp.status);
                                return (
                                    <div key={camp.id} onClick={() => openCampaign(camp)}
                                        className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5 hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer group">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-[15px] font-bold text-white truncate group-hover:text-visio-accent transition-colors">{camp.title}</h3>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium flex items-center gap-1 shrink-0 ${s?.color || 'bg-white/10 text-white/40'}`}>
                                                        {s?.icon} {s?.label}
                                                    </span>
                                                </div>
                                                {camp.description && <p className="text-xs text-white/25 mb-2 line-clamp-1">{camp.description}</p>}
                                                <div className="flex flex-wrap gap-1.5">
                                                    {camp.target_regions?.slice(0, 5).map(r => (
                                                        <span key={r} className="px-1.5 py-0.5 bg-visio-accent/8 text-visio-accent/70 text-[10px] rounded font-medium">{r}</span>
                                                    ))}
                                                    {camp.genres?.slice(0, 3).map(g => (
                                                        <span key={g} className="px-1.5 py-0.5 bg-purple-500/8 text-purple-400/70 text-[10px] rounded font-medium">{g}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 shrink-0">
                                                <div className="hidden md:flex gap-4 text-[11px] text-white/25">
                                                    <span className="flex items-center gap-1"><Users size={11} /> {camp.contact_count}</span>
                                                    <span className="flex items-center gap-1"><Send size={11} /> {camp.sent_count}</span>
                                                    <span className="flex items-center gap-1 text-green-400/50"><Star size={11} /> {camp.booked_count}</span>
                                                </div>
                                                <ChevronRight size={16} className="text-white/10 group-hover:text-white/30 transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}

                {view === 'list' && loading && (
                    <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-white/20" /></div>
                )}

                {/* ═══ CAMPAIGN DETAIL ═══ */}
                {view === 'detail' && selectedCampaign && (
                    <div className="space-y-6">
                        {/* Progress Stepper */}
                        <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5">
                            <div className="flex items-center justify-between overflow-x-auto gap-1">
                                {STATUS_FLOW.map((step, i) => {
                                    const isActive = step.key === selectedCampaign.status;
                                    const isDone = i < statusIdx;
                                    return (
                                        <React.Fragment key={step.key}>
                                            {i > 0 && <div className={`h-px flex-1 min-w-[20px] ${isDone ? 'bg-green-500/30' : 'bg-white/5'}`} />}
                                            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                                                isActive ? 'bg-visio-accent/15 text-visio-accent border border-visio-accent/20' :
                                                isDone ? 'bg-green-500/10 text-green-400/60' : 'text-white/15'
                                            }`}>
                                                {isDone ? <Check size={11} /> : step.icon}
                                                <span className="hidden sm:inline">{step.label}</span>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ─── CONTACTS TAB ─── */}
                        {detailTab === 'contacts' && (
                            <>
                                {/* Pipeline Cards */}
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                    {Object.entries(OUTREACH_CONFIG).map(([key, cfg]) => (
                                        <button key={key} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
                                            className={`p-3 rounded-xl text-center transition-all ${filterStatus === key ? `${cfg.bg} border border-current/20` : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]'}`}>
                                            <div className={`text-lg font-bold ${cfg.color}`}>{(pipeline as any)[key]}</div>
                                            <div className={`text-[9px] uppercase tracking-wider ${filterStatus === key ? cfg.color : 'text-white/20'}`}>{cfg.label}</div>
                                        </button>
                                    ))}
                                </div>

                                {/* Filters */}
                                <div className="flex flex-wrap gap-2 items-center">
                                    <div className="relative flex-1 min-w-[200px]">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search name, company, city, email..."
                                            className="w-full pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white placeholder:text-white/15 focus:outline-none focus:border-visio-accent/30 transition-colors" />
                                    </div>
                                    <div className="flex gap-1">
                                        {['all', ...Object.keys(TYPE_CONFIG)].map(t => (
                                            <button key={t} onClick={() => setFilterType(t)}
                                                className={`px-2.5 py-2 rounded-lg text-[10px] font-medium transition-colors ${
                                                    filterType === t ? 'bg-visio-accent/15 text-visio-accent' : 'bg-white/[0.03] text-white/25 hover:text-white/40'
                                                }`}>
                                                {t === 'all' ? 'All' : TYPE_CONFIG[t]?.label || t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Contact List */}
                                {contactsLoading ? (
                                    <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-white/15" /></div>
                                ) : filteredContacts.length === 0 ? (
                                    <div className="text-center py-16 space-y-3">
                                        <Building2 size={48} className="text-white/[0.06] mx-auto" />
                                        <p className="text-white/30 text-sm">
                                            {contacts.length === 0 ? 'V-Prai\'s team is researching contacts for this campaign.' : 'No contacts match your filters.'}
                                        </p>
                                        {contacts.length === 0 && <p className="text-white/15 text-xs">You'll be notified when contacts are ready for review.</p>}
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {filteredContacts.map(contact => {
                                            const tc = TYPE_CONFIG[contact.type] || { label: contact.type, color: 'bg-white/10 text-white/40' };
                                            const oc = OUTREACH_CONFIG[contact.outreach_status] || OUTREACH_CONFIG.pending;
                                            return (
                                                <div key={contact.id} className="bg-white/[0.015] border border-white/[0.03] rounded-xl px-4 py-3.5 hover:border-white/[0.08] transition-colors group">
                                                    <div className="flex items-center gap-4">
                                                        {/* Left: Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <h4 className="text-[13px] font-semibold text-white truncate">{contact.name}</h4>
                                                                {contact.verified && <CheckCircle2 size={11} className="text-green-400/60 shrink-0" />}
                                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${tc.color}`}>{tc.label}</span>
                                                            </div>
                                                            <p className="text-[11px] text-white/30 truncate">{contact.company}{contact.role !== 'Contact' ? ` · ${contact.role}` : ''}</p>
                                                        </div>

                                                        {/* Middle: Location + contacts */}
                                                        <div className="hidden md:flex items-center gap-3 text-[11px] text-white/20 shrink-0">
                                                            {contact.city && <span className="flex items-center gap-1"><MapPin size={10} />{contact.city}</span>}
                                                            {contact.email && (
                                                                <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:text-white/40 transition-colors">
                                                                    <Mail size={10} />{contact.email}
                                                                </a>
                                                            )}
                                                            {contact.linkedin && (
                                                                <a href={contact.linkedin} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="hover:text-blue-400 transition-colors">
                                                                    <Linkedin size={11} />
                                                                </a>
                                                            )}
                                                            {contact.website && (
                                                                <a href={contact.website} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="hover:text-white/40 transition-colors">
                                                                    <ExternalLink size={11} />
                                                                </a>
                                                            )}
                                                        </div>

                                                        {/* Right: Status */}
                                                        <select value={contact.outreach_status} onChange={e => updateOutreach(contact.id, e.target.value)}
                                                            onClick={e => e.stopPropagation()}
                                                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border-0 cursor-pointer shrink-0 ${oc.bg} ${oc.color}`}>
                                                            {Object.entries(OUTREACH_CONFIG).map(([k, v]) => (
                                                                <option key={k} value={k}>{v.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}

                        {/* ─── EMAIL TAB ─── */}
                        {detailTab === 'email' && (
                            <div className="space-y-6">
                                <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Mail size={15} className="text-visio-accent" /> Outreach Email Template</h3>
                                        <button onClick={saveEmailTemplate} disabled={savingEmail}
                                            className="px-4 py-2 bg-white text-black rounded-xl text-xs font-bold hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-1.5">
                                            {savingEmail ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Template
                                        </button>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Subject Line</label>
                                        <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                                            placeholder="e.g., Dancehall DJ Available for Bookings — DJ Radix FyaBaby (Sony Music)"
                                            className="w-full mt-1.5 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/15 focus:outline-none focus:border-visio-accent/40 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Email Body</label>
                                        <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={14}
                                            placeholder={"Hi [Name],\n\nI'm [Artist Name] — a [genre] DJ based in [city]. I'm planning a tour through [region] and I'd love to connect about a potential booking at [Venue/Company].\n\n[Key credentials, links, social proof]\n\nI'd love to:\n- Guest DJ at your next event\n- Do a trial set\n- Collaborate on a themed night\n\nCheck my latest mixes: [link]\n\nBest,\n[Artist Name]\n[Contact info]"}
                                            className="w-full mt-1.5 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/15 focus:outline-none focus:border-visio-accent/40 resize-none font-mono leading-relaxed transition-colors" />
                                    </div>
                                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                        <p className="text-[11px] text-amber-400/60 flex items-start gap-2">
                                            <Sparkles size={12} className="shrink-0 mt-0.5" />
                                            V-Prai's team will personalize this template for each contact before sending. Variables like [Name], [Venue], and [Company] will be replaced automatically.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── ANALYTICS TAB ─── */}
                        {detailTab === 'analytics' && (
                            <div className="space-y-6">
                                {/* Key Metrics */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Total Contacts', value: stats.total, sub: `${stats.verified} verified · ${stats.withEmail} with email`, color: 'text-white' },
                                        { label: 'Outreach Sent', value: stats.sent, sub: `${contacts.length > 0 ? Math.round((stats.sent / contacts.length) * 100) : 0}% of contacts`, color: 'text-blue-400' },
                                        { label: 'Reply Rate', value: `${stats.replyRate}%`, sub: `${stats.engaged} engaged of ${stats.sent} sent`, color: 'text-cyan-400' },
                                        { label: 'Booking Rate', value: `${stats.bookRate}%`, sub: `${pipeline.booked} confirmed bookings`, color: 'text-green-400' },
                                    ].map((m, i) => (
                                        <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5">
                                            <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                                            <div className="text-[10px] text-white/30 uppercase tracking-wider mt-1">{m.label}</div>
                                            <div className="text-[10px] text-white/15 mt-2">{m.sub}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pipeline Funnel */}
                                <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-6">
                                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><TrendingUp size={14} className="text-visio-accent" /> Outreach Pipeline</h3>
                                    <div className="space-y-3">
                                        {Object.entries(OUTREACH_CONFIG).map(([key, cfg]) => {
                                            const count = (pipeline as any)[key];
                                            const pct = contacts.length > 0 ? (count / contacts.length) * 100 : 0;
                                            return (
                                                <div key={key} className="flex items-center gap-3">
                                                    <span className={`text-[11px] font-medium w-16 ${cfg.color}`}>{cfg.label}</span>
                                                    <div className="flex-1 h-6 bg-white/[0.03] rounded-lg overflow-hidden relative">
                                                        <div className={`h-full ${cfg.bg} rounded-lg transition-all duration-500`} style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }} />
                                                        {count > 0 && (
                                                            <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-white/60">{count}</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-white/20 w-10 text-right">{Math.round(pct)}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Contact Type Breakdown */}
                                <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-6">
                                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><BarChart3 size={14} className="text-visio-accent" /> Contact Breakdown</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                                            const count = contacts.filter(c => c.type === key).length;
                                            if (count === 0) return null;
                                            return (
                                                <div key={key} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
                                                    <span className="text-sm font-bold text-white">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Regional Breakdown */}
                                {contacts.length > 0 && (
                                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-6">
                                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Globe size={14} className="text-visio-accent" /> By Region</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {Object.entries(
                                                contacts.reduce((acc, c) => {
                                                    const key = c.country || c.region || 'Unknown';
                                                    acc[key] = (acc[key] || 0) + 1;
                                                    return acc;
                                                }, {} as Record<string, number>)
                                            ).sort((a, b) => b[1] - a[1]).map(([region, count]) => (
                                                <div key={region} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
                                                    <span className="text-xs text-white/40 flex items-center gap-1.5"><MapPin size={10} />{region}</span>
                                                    <span className="text-sm font-bold text-white">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
