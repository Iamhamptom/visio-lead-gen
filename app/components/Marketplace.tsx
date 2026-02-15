'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Users,
    Filter,
    ChevronDown,
    Store,
    Globe,
    Coins,
    Mail,
    Target,
    BarChart3,
    FileText,
    TrendingUp,
    Sparkles,
    Download,
    Lock,
    Copy,
    Check,
    ExternalLink,
    X,
    Music,
    Instagram,
    Upload,
    Send,
    Loader2,
    Zap,
    ArrowRight,
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
    profilePic?: string;
    realInstagram?: string;
}

interface MarketplaceProps {
    onNewChat: () => void;
    subscriptionTier?: SubscriptionTier;
}

function parseFollowers(str: string | undefined): number {
    if (!str || str === '\u2014' || str === '-') return 0;
    const s = str.replace(/\+/g, '').replace(/,/g, '').trim();
    const mMatch = s.match(/([\d.]+)\s*M/i);
    if (mMatch) return parseFloat(mMatch[1]) * 1_000_000;
    const kMatch = s.match(/([\d.]+)\s*K/i);
    if (kMatch) return parseFloat(kMatch[1]) * 1_000;
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
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

const SA_GENRES = [
    'Amapiano', 'Afrobeats', 'Hip Hop', 'R&B', 'Gqom', 'House', 'Kwaito',
    'Maskandi', 'Gospel', 'Jazz', 'Pop', 'Rock', 'Afro-Soul', 'Dance', 'Other'
];

const ITEMS_PER_PAGE = 30;

// Deterministic gradient colors from a name
const GRADIENT_PAIRS = [
    ['from-pink-500', 'to-purple-600'],
    ['from-cyan-500', 'to-blue-600'],
    ['from-emerald-500', 'to-teal-600'],
    ['from-orange-500', 'to-red-600'],
    ['from-violet-500', 'to-indigo-600'],
    ['from-amber-500', 'to-yellow-600'],
    ['from-rose-500', 'to-pink-600'],
    ['from-teal-500', 'to-cyan-600'],
    ['from-fuchsia-500', 'to-purple-600'],
    ['from-lime-500', 'to-emerald-600'],
];

function getGradient(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const pair = GRADIENT_PAIRS[Math.abs(hash) % GRADIENT_PAIRS.length];
    return `bg-gradient-to-br ${pair[0]} ${pair[1]}`;
}

function getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// TikTok SVG icon (not in lucide)
const TikTokIcon = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.71a8.27 8.27 0 0 0 4.76 1.5v-3.4a4.85 4.85 0 0 1-1-.12z" />
    </svg>
);

// Twitter/X SVG icon
const XIcon = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

function csvEscape(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

// ─── Music Submission Modal ────────────────────────────────────────────
interface SubmissionForm {
    artistName: string;
    email: string;
    genre: string;
    songLink: string;
    epkLink: string;
    message: string;
}

const MusicSubmissionModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [form, setForm] = useState<SubmissionForm>({
        artistName: '', email: '', genre: '', songLink: '', epkLink: '', message: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setError('');
        if (!form.artistName.trim()) return setError('Artist name is required');
        if (!form.email.trim() || !form.email.includes('@')) return setError('Valid email is required');
        if (!form.genre) return setError('Please select a genre');
        if (!form.songLink.trim()) return setError('Song link is required');

        setSubmitting(true);
        try {
            const res = await fetch('/api/submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Submission failed');

            if (data.checkoutUrl) {
                // Redirect to payment
                window.location.href = data.checkoutUrl;
            } else {
                setSubmitted(true);
            }
        } catch (e: any) {
            setError(e.message || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="relative p-6 pb-4 border-b border-white/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-visio-teal via-purple-500 to-pink-500" />
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-visio-teal/20 to-purple-500/20 border border-visio-teal/20">
                            <Send size={20} className="text-visio-teal" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Send Your Music</h2>
                            <p className="text-xs text-white/40">to 100+ SA media pages & curators</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">South Africa Only</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">$10 / R180</span>
                    </div>
                </div>

                {submitted ? (
                    /* Success State */
                    <div className="p-8 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Check size={32} className="text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Submission Received!</h3>
                        <p className="text-sm text-white/50">
                            Our team will review your submission and distribute it to 100+ curators and media pages.
                            You&apos;ll receive a confirmation email shortly.
                        </p>
                        <button
                            onClick={() => { setSubmitted(false); setForm({ artistName: '', email: '', genre: '', songLink: '', epkLink: '', message: '' }); onClose(); }}
                            className="px-6 py-2.5 bg-visio-teal/10 text-visio-teal border border-visio-teal/20 rounded-xl text-sm hover:bg-visio-teal/20 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    /* Form */
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        {/* Artist Name */}
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Artist / Band Name *</label>
                            <input
                                type="text"
                                value={form.artistName}
                                onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))}
                                placeholder="e.g. DJ Maphorisa"
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-visio-teal/50"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Email Address *</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="your@email.com"
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-visio-teal/50"
                            />
                        </div>

                        {/* Genre */}
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Genre *</label>
                            <select
                                value={form.genre}
                                onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-visio-teal/50 appearance-none"
                            >
                                <option value="" className="bg-[#111]">Select genre...</option>
                                {SA_GENRES.map(g => (
                                    <option key={g} value={g} className="bg-[#111]">{g}</option>
                                ))}
                            </select>
                        </div>

                        {/* Song Link */}
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Song Link * <span className="text-white/25">(SoundCloud, Spotify, YouTube, Drive)</span></label>
                            <input
                                type="url"
                                value={form.songLink}
                                onChange={e => setForm(f => ({ ...f, songLink: e.target.value }))}
                                placeholder="https://soundcloud.com/your-track"
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-visio-teal/50"
                            />
                        </div>

                        {/* EPK Link */}
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">EPK / Press Kit <span className="text-white/25">(PDF link or Drive folder - optional)</span></label>
                            <input
                                type="url"
                                value={form.epkLink}
                                onChange={e => setForm(f => ({ ...f, epkLink: e.target.value }))}
                                placeholder="https://drive.google.com/your-epk"
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-visio-teal/50"
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Short Message <span className="text-white/25">(optional - tell us about your release)</span></label>
                            <textarea
                                value={form.message}
                                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                rows={3}
                                placeholder="Tell us about your track, release date, etc..."
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-visio-teal/50 resize-none"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">{error}</p>
                        )}

                        {/* What you get */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
                            <p className="text-xs font-medium text-white/60">What you get:</p>
                            <ul className="space-y-1.5">
                                {[
                                    'Your music sent to 100+ SA media pages & curators',
                                    'Targeted by genre for maximum relevance',
                                    'Professional pitch crafted by our team',
                                    'Delivery report within 48 hours',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-white/40">
                                        <Check size={12} className="text-visio-teal mt-0.5 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full py-3 bg-gradient-to-r from-visio-teal to-emerald-500 text-black font-bold rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <><Loader2 size={16} className="animate-spin" /> Processing...</>
                            ) : (
                                <><Zap size={16} /> Submit & Pay $10 (R180)</>
                            )}
                        </button>
                        <p className="text-[10px] text-white/20 text-center">Secure payment via Yoco. South African artists only.</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

// ─── Main Marketplace Component ────────────────────────────────────────
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
    const [copied, setCopied] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);

    // Load contacts from API on mount
    React.useEffect(() => {
        fetch('/api/marketplace')
            .then(res => res.json())
            .then(data => {
                setContacts(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => {
                // Fallback to static file
                fetch('/data/db_ZA.json')
                    .then(res => res.json())
                    .then(data => {
                        setContacts(Array.isArray(data) ? data : []);
                        setLoading(false);
                    })
                    .catch(() => setLoading(false));
            });
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
                c.tiktok?.toLowerCase().includes(q) ||
                c.twitter?.toLowerCase().includes(q)
            );
        }
        if (selectedIndustry !== 'all') {
            result = result.filter(c => c.industry === selectedIndustry);
        }
        // Always sort by follower count descending (most followers first)
        result = [...result].sort((a, b) => parseFollowers(b.followers) - parseFollowers(a.followers));
        return result;
    }, [contacts, searchQuery, selectedIndustry]);

    const visibleContacts = filtered.slice(0, visibleCount);

    const hasSocials = (c: MarketplaceContact) => c.instagram || c.tiktok || c.twitter;

    // Download filtered contacts as CSV
    const handleDownloadCSV = () => {
        const listToExport = searchQuery || selectedIndustry !== 'all' ? filtered : contacts;
        const lines: string[] = [];
        lines.push('Name,Company,Industry,Email,Followers,Country,Instagram,TikTok,Twitter,Status');
        listToExport.forEach(c => {
            lines.push([
                csvEscape(c.person || ''),
                csvEscape(c.company || ''),
                csvEscape(c.industry || c.title || ''),
                csvEscape(c.email || ''),
                csvEscape(c.followers || ''),
                csvEscape(c.country || ''),
                csvEscape(c.instagram || ''),
                csvEscape(c.tiktok || ''),
                csvEscape(c.twitter || ''),
                csvEscape(c.status || ''),
            ].join(','));
        });
        const csv = lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visio-marketplace-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Download filtered contacts as Markdown
    const handleDownloadMD = () => {
        const listToExport = searchQuery || selectedIndustry !== 'all' ? filtered : contacts;
        const date = new Date().toLocaleDateString();
        let md = `# Visio Marketplace Export\n`;
        md += `Date: ${date}\n`;
        md += `Total Pages: ${listToExport.length}\n`;
        md += `Filter: ${selectedIndustry === 'all' ? 'All Industries' : selectedIndustry}\n\n`;
        md += `---\n\n`;

        listToExport.forEach(c => {
            md += `### ${c.person}\n`;
            md += `- **Industry:** ${c.industry || c.title || 'N/A'}\n`;
            md += `- **Company:** ${c.company || 'N/A'}\n`;
            md += `- **Email:** ${c.email || 'N/A'}\n`;
            md += `- **Followers:** ${c.followers || 'N/A'}\n`;
            md += `- **Country:** ${c.country || 'N/A'}\n`;
            if (c.instagram) md += `- **Instagram:** ${c.instagram}\n`;
            if (c.tiktok) md += `- **TikTok:** ${c.tiktok}\n`;
            if (c.twitter) md += `- **Twitter:** ${c.twitter}\n`;
            md += `- **Status:** ${c.status || 'N/A'}\n`;
            md += `\n---\n\n`;
        });

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visio-marketplace-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Copy as Markdown to clipboard
    const handleCopyMD = () => {
        const listToExport = searchQuery || selectedIndustry !== 'all' ? filtered : contacts;
        const date = new Date().toLocaleDateString();
        let md = `# Visio Marketplace Export\nDate: ${date}\nTotal: ${listToExport.length}\n\n`;
        listToExport.forEach(c => {
            md += `### ${c.person}\n`;
            md += `- **Email:** ${c.email || 'N/A'}\n`;
            md += `- **Industry:** ${c.industry || 'N/A'}\n`;
            md += `- **Followers:** ${c.followers || 'N/A'}\n`;
            if (c.instagram) md += `- **Instagram:** ${c.instagram}\n`;
            if (c.tiktok) md += `- **TikTok:** ${c.tiktok}\n`;
            if (c.twitter) md += `- **Twitter:** ${c.twitter}\n`;
            md += `\n`;
        });
        navigator.clipboard.writeText(md);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCardClick = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="flex-1 h-full overflow-y-auto p-8 space-y-6">
            {/* Submission Modal */}
            <AnimatePresence>
                {showSubmissionModal && (
                    <MusicSubmissionModal isOpen={showSubmissionModal} onClose={() => setShowSubmissionModal(false)} />
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Store size={28} className="text-visio-teal" />
                    <h1 className="text-3xl font-outfit font-bold text-white">Marketplace</h1>
                    <span className="text-xs bg-visio-teal/10 text-visio-teal px-3 py-1 rounded-full border border-visio-teal/20 font-medium">
                        {contacts.length} Pages
                    </span>
                </div>
                <p className="text-white/40">Browse curated SA industry pages. Click a card to view details, or download as CSV/MD.</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 w-fit border border-white/5">
                <button
                    onClick={() => setActiveTab('pages')}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'pages' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
                >
                    <span className="flex items-center gap-2">
                        <Users size={14} />
                        Pages ({contacts.length})
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
                    {/* Search, Filters & Export */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                type="text"
                                placeholder="Search pages, genres, handles..."
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
                        {/* Export buttons */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleCopyMD}
                                className="flex items-center gap-2 px-3 py-3 rounded-xl hover:bg-white/5 text-white/50 hover:text-white transition-colors text-sm"
                                title="Copy contacts as Markdown"
                            >
                                {copied ? <Check size={16} className="text-visio-teal" /> : <Copy size={16} />}
                                <span className="hidden sm:inline text-xs">{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                            <button
                                onClick={handleDownloadMD}
                                className="flex items-center gap-2 px-3 py-3 hover:bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white text-sm transition-colors"
                                title="Download as Markdown (includes contacts)"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline text-xs">MD</span>
                            </button>
                            <button
                                onClick={handleDownloadCSV}
                                className="flex items-center gap-2 px-3 py-3 bg-visio-teal/10 hover:bg-visio-teal/20 border border-visio-teal/20 rounded-xl text-visio-teal text-sm transition-colors"
                                title="Download as CSV (includes contacts)"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline text-xs">CSV</span>
                            </button>
                        </div>
                    </div>

                    {/* CTA: Send Your Music */}
                    <motion.button
                        onClick={() => setShowSubmissionModal(true)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full relative overflow-hidden rounded-2xl border border-visio-teal/20 bg-gradient-to-r from-visio-teal/5 via-purple-500/5 to-pink-500/5 hover:from-visio-teal/10 hover:via-purple-500/10 hover:to-pink-500/10 transition-all group"
                    >
                        <div className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-gradient-to-br from-visio-teal/20 to-purple-500/20 border border-visio-teal/20 group-hover:scale-110 transition-transform">
                                    <Music size={22} className="text-visio-teal" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-sm font-bold text-white group-hover:text-visio-teal transition-colors">
                                        Wanna send your music to 100+ influential media pages?
                                    </h3>
                                    <p className="text-xs text-white/40 mt-0.5">
                                        We&apos;ll pitch your track to curators, bloggers & DJs across South Africa — <span className="text-amber-400">only $10</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="hidden sm:inline text-xs font-medium text-visio-teal bg-visio-teal/10 px-3 py-1.5 rounded-full border border-visio-teal/20">
                                    Click Here
                                </span>
                                <ArrowRight size={18} className="text-visio-teal group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                        {/* Animated gradient line */}
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-visio-teal via-purple-500 to-pink-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </motion.button>

                    {/* Results count */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-white/30">{filtered.length} results</p>
                        <span className="text-[10px] text-white/20 flex items-center gap-1">
                            <Lock size={10} /> Full contact info on download
                        </span>
                    </div>

                    {/* Pages Grid */}
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {[...Array(18)].map((_, i) => (
                                <div key={i} className="flex flex-col items-center gap-3 p-4">
                                    <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
                                    <div className="w-20 h-3 bg-white/5 rounded animate-pulse" />
                                    <div className="w-14 h-2 bg-white/5 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-12 text-center">
                            <Users size={40} className="text-white/10 mx-auto mb-3" />
                            <p className="text-white/40 text-sm">No results found. Try a different search or filter.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                {visibleContacts.map((contact, i) => {
                                    const isExpanded = expandedId === contact.id;
                                    return (
                                        <motion.div
                                            key={contact.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: Math.min(i * 0.015, 0.4), type: 'spring', stiffness: 300, damping: 25 }}
                                            onClick={() => handleCardClick(contact.id)}
                                            className={`relative flex flex-col items-center p-4 rounded-2xl cursor-pointer transition-all duration-200 group
                                                ${isExpanded
                                                    ? 'bg-white/[0.08] border-visio-teal/30 border shadow-lg shadow-visio-teal/5 col-span-2 row-span-2 sm:col-span-2'
                                                    : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] hover:border-white/15 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5'
                                                }`}
                                        >
                                            {/* Profile Avatar Bubble */}
                                            <div className={`relative mb-3 ${isExpanded ? 'w-20 h-20' : 'w-14 h-14'} transition-all duration-200`}>
                                                {contact.profilePic ? (
                                                    <img
                                                        src={contact.profilePic}
                                                        alt={contact.person}
                                                        className={`w-full h-full rounded-full object-cover shadow-lg ring-2 ring-white/10`}
                                                        onError={(e) => {
                                                            const target = e.currentTarget;
                                                            target.style.display = 'none';
                                                            const fallback = target.nextElementSibling as HTMLElement;
                                                            if (fallback) fallback.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div
                                                    className={`w-full h-full rounded-full ${getGradient(contact.person)} items-center justify-center text-white font-bold shadow-lg ${isExpanded ? 'text-xl' : 'text-sm'}`}
                                                    style={{ display: contact.profilePic ? 'none' : 'flex' }}
                                                >
                                                    {getInitials(contact.person)}
                                                </div>
                                                {/* Verified badge */}
                                                {contact.status === 'Verified' && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-visio-teal rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                                                        <Check size={10} className="text-white" strokeWidth={3} />
                                                    </div>
                                                )}
                                                {/* Online-style dot for follower count */}
                                                {contact.followers && (
                                                    <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-black/80 border border-white/10 rounded-full">
                                                        <span className="text-[8px] text-white/70 font-medium">{contact.followers}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Name */}
                                            <h4 className={`font-semibold text-white text-center leading-tight mb-1 group-hover:text-visio-teal transition-colors ${isExpanded ? 'text-sm' : 'text-xs'}`}>
                                                {contact.person}
                                            </h4>

                                            {/* Industry Tag */}
                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 mb-2 truncate max-w-full">
                                                {contact.industry || contact.title}
                                            </span>

                                            {/* Social Platform Icons (always visible) */}
                                            {hasSocials(contact) && (
                                                <div className="flex items-center gap-1.5">
                                                    {contact.instagram && (
                                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center" title={contact.realInstagram || contact.instagram}>
                                                            <Instagram size={10} className="text-white" />
                                                        </div>
                                                    )}
                                                    {contact.tiktok && (
                                                        <div className="w-5 h-5 rounded-full bg-black border border-white/20 flex items-center justify-center" title={contact.tiktok}>
                                                            <TikTokIcon size={10} className="text-white" />
                                                        </div>
                                                    )}
                                                    {contact.twitter && (
                                                        <div className="w-5 h-5 rounded-full bg-black border border-white/20 flex items-center justify-center" title={contact.twitter}>
                                                            <XIcon size={10} className="text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Expanded Details */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="w-full mt-3 pt-3 border-t border-white/10 space-y-2 overflow-hidden"
                                                    >
                                                        {contact.company && contact.company !== contact.person && (
                                                            <div className="flex items-center gap-2 text-xs text-white/50">
                                                                <Globe size={12} className="shrink-0" />
                                                                <span className="truncate">{contact.company}</span>
                                                            </div>
                                                        )}
                                                        {contact.country && (
                                                            <div className="flex items-center gap-2 text-xs text-white/50">
                                                                <span className="text-sm">🇿🇦</span>
                                                                <span>{contact.country === 'ZA' ? 'South Africa' : contact.country}</span>
                                                            </div>
                                                        )}
                                                        {contact.instagram && (
                                                            <div className="flex items-center gap-2 text-xs text-pink-400/80">
                                                                <Instagram size={12} className="shrink-0" />
                                                                <span className="truncate">{contact.realInstagram || contact.instagram}</span>
                                                            </div>
                                                        )}
                                                        {contact.tiktok && (
                                                            <div className="flex items-center gap-2 text-xs text-white/60">
                                                                <TikTokIcon size={12} />
                                                                <span className="truncate">{contact.tiktok}</span>
                                                            </div>
                                                        )}
                                                        {contact.twitter && (
                                                            <div className="flex items-center gap-2 text-xs text-white/60">
                                                                <XIcon size={12} />
                                                                <span className="truncate">{contact.twitter}</span>
                                                            </div>
                                                        )}
                                                        {contact.dateAdded && (
                                                            <p className="text-[10px] text-white/20 pt-1">Added {contact.dateAdded}</p>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
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

                            {/* CTA Banner */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="mt-8 relative overflow-hidden rounded-2xl border border-visio-teal/20 bg-gradient-to-r from-visio-teal/10 via-purple-500/10 to-visio-teal/10 p-6 sm:p-8"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-visio-teal/5 via-transparent to-purple-500/5 animate-pulse" />
                                <div className="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-visio-teal/20 flex items-center justify-center">
                                        <Zap size={24} className="text-visio-teal" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-semibold text-lg mb-1">
                                            Want more access to our insane VisioCorp tools?
                                        </h3>
                                        <p className="text-white/50 text-sm">
                                            Partner with us and unlock the full power of AI-driven music marketing.
                                        </p>
                                    </div>
                                    <a
                                        href="mailto:admin@visiocorp.co"
                                        className="flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-visio-teal text-black font-semibold rounded-xl hover:bg-visio-teal/90 transition-all hover:scale-105 shadow-lg shadow-visio-teal/20"
                                    >
                                        <Mail size={16} />
                                        Contact us
                                        <ArrowRight size={16} />
                                    </a>
                                </div>
                                <p className="relative text-center mt-4 text-white/30 text-xs tracking-wide">
                                    admin@visiocorp.co
                                </p>
                            </motion.div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};
