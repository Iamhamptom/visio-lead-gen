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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md" 
                onClick={onClose} 
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="relative p-6 sm:p-8 pb-6 border-b border-white/5 bg-white/[0.02]">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-visio-teal via-purple-500 to-pink-500" />
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
                        <X size={18} />
                    </button>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-visio-teal/20 to-purple-500/20 border border-visio-teal/20 shadow-lg shadow-visio-teal/10">
                            <Send size={24} className="text-visio-teal" />
                        </div>
                        <div>
                            <h2 className="text-xl font-outfit font-bold text-white tracking-wide">Send Your Music</h2>
                            <p className="text-sm text-white/50">to 100+ SA media pages & curators</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">South Africa Only</span>
                        <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">$10 / R180</span>
                    </div>
                </div>

                {submitted ? (
                    /* Success State */
                    <div className="p-10 text-center space-y-6 flex-1 flex flex-col justify-center items-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-2">
                            <Check size={40} className="text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Submission Received!</h3>
                            <p className="text-sm text-white/50 max-w-sm mx-auto leading-relaxed">
                                Our team will review your submission and distribute it to 100+ curators and media pages.
                                You&apos;ll receive a confirmation email shortly.
                            </p>
                        </div>
                        <button
                            onClick={() => { setSubmitted(false); setForm({ artistName: '', email: '', genre: '', songLink: '', epkLink: '', message: '' }); onClose(); }}
                            className="px-8 py-3 bg-white/10 text-white hover:bg-white/20 border border-white/10 rounded-2xl font-medium transition-all"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    /* Form */
                    <div className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                        <div className="space-y-4">
                            {/* Artist Name */}
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Artist / Band Name *</label>
                                <input
                                    type="text"
                                    value={form.artistName}
                                    onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))}
                                    placeholder="e.g. DJ Maphorisa"
                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-visio-teal/50 focus:ring-1 focus:ring-visio-teal/50 transition-all shadow-inner"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Email Address *</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="your@email.com"
                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-visio-teal/50 focus:ring-1 focus:ring-visio-teal/50 transition-all shadow-inner"
                                />
                            </div>

                            {/* Genre */}
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Genre *</label>
                                <div className="relative">
                                    <select
                                        value={form.genre}
                                        onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-visio-teal/50 focus:ring-1 focus:ring-visio-teal/50 transition-all appearance-none shadow-inner"
                                    >
                                        <option value="" className="bg-[#111]">Select genre...</option>
                                        {SA_GENRES.map(g => (
                                            <option key={g} value={g} className="bg-[#111]">{g}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                                </div>
                            </div>

                            {/* Song Link */}
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Song Link * <span className="text-white/30 normal-case tracking-normal">(SoundCloud, Spotify, YouTube, Drive)</span></label>
                                <input
                                    type="url"
                                    value={form.songLink}
                                    onChange={e => setForm(f => ({ ...f, songLink: e.target.value }))}
                                    placeholder="https://soundcloud.com/your-track"
                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-visio-teal/50 focus:ring-1 focus:ring-visio-teal/50 transition-all shadow-inner"
                                />
                            </div>

                            {/* EPK Link */}
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">EPK / Press Kit <span className="text-white/30 normal-case tracking-normal">(PDF link or Drive - optional)</span></label>
                                <input
                                    type="url"
                                    value={form.epkLink}
                                    onChange={e => setForm(f => ({ ...f, epkLink: e.target.value }))}
                                    placeholder="https://drive.google.com/your-epk"
                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-visio-teal/50 focus:ring-1 focus:ring-visio-teal/50 transition-all shadow-inner"
                                />
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Short Message <span className="text-white/30 normal-case tracking-normal">(optional)</span></label>
                                <textarea
                                    value={form.message}
                                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                    rows={3}
                                    placeholder="Tell us about your track, release date, etc..."
                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-visio-teal/50 focus:ring-1 focus:ring-visio-teal/50 transition-all resize-none shadow-inner"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                <X size={16} className="shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        {/* What you get */}
                        <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 rounded-2xl p-5 space-y-3">
                            <p className="text-sm font-semibold text-white/80">What you get:</p>
                            <ul className="space-y-2.5">
                                {[
                                    'Your music sent to 100+ SA media pages & curators',
                                    'Targeted by genre for maximum relevance',
                                    'Professional pitch crafted by our team',
                                    'Delivery report within 48 hours',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-white/60">
                                        <div className="mt-0.5 w-4 h-4 rounded-full bg-visio-teal/20 flex items-center justify-center shrink-0">
                                            <Check size={10} className="text-visio-teal" />
                                        </div>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2 pb-1">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full py-4 bg-gradient-to-r from-visio-teal to-emerald-500 hover:from-visio-teal/90 hover:to-emerald-500/90 text-black font-bold rounded-2xl text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-visio-teal/20 hover:shadow-visio-teal/40"
                            >
                                {submitting ? (
                                    <><Loader2 size={18} className="animate-spin" /> Processing...</>
                                ) : (
                                    <><Zap size={18} /> Submit & Pay $10 (R180)</>
                                )}
                            </button>
                            <p className="text-[11px] text-white/30 text-center mt-3 flex items-center justify-center gap-1.5">
                                <Lock size={10} /> Secure payment via Yoco. South African artists only.
                            </p>
                        </div>
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
        <div className="flex-1 h-full overflow-y-auto bg-[#050505] custom-scrollbar relative">
            {/* Background glow effects */}
            <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-visio-teal/5 via-purple-500/5 to-transparent pointer-events-none opacity-50" />
            
            <div className="max-w-7xl mx-auto p-6 sm:p-8 lg:p-10 space-y-8 relative z-10">
                {/* Submission Modal */}
                <AnimatePresence>
                    {showSubmissionModal && (
                        <MusicSubmissionModal isOpen={showSubmissionModal} onClose={() => setShowSubmissionModal(false)} />
                    )}
                </AnimatePresence>

                {/* Header */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-visio-teal/20 to-emerald-500/20 border border-visio-teal/20 shadow-lg shadow-visio-teal/10">
                            <Store size={28} className="text-visio-teal" />
                        </div>
                        <h1 className="text-4xl font-outfit font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">Marketplace</h1>
                        <span className="text-xs bg-visio-teal/10 text-visio-teal px-3 py-1.5 rounded-full border border-visio-teal/20 font-medium tracking-wide">
                            {contacts.length} Pages
                        </span>
                    </div>
                    <p className="text-white/50 text-sm max-w-2xl leading-relaxed">
                        Browse curated South African industry pages, curators, and media outlets. Click a card to view detailed contact info or export the list for your next campaign.
                    </p>
                </div>

                {/* Controls Area (Tabs, Search, Filters, Export) */}
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-3xl backdrop-blur-md">
                    
                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-black/40 rounded-2xl p-1.5 border border-white/5 shadow-inner w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('pages')}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'pages' ? 'bg-white text-black shadow-md' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <Users size={16} />
                                Pages ({contacts.length})
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('tools')}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'tools' ? 'bg-white text-black shadow-md' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <Sparkles size={16} />
                                AI Tools ({AI_TOOLS.length})
                            </span>
                        </button>
                    </div>

                    {activeTab === 'pages' && (
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            {/* Search */}
                            <div className="relative flex-1 sm:w-64">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="text"
                                    placeholder="Search handles, names, genres..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
                                    className="w-full pl-11 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-visio-teal/50 focus:ring-1 focus:ring-visio-teal/50 transition-all shadow-inner"
                                />
                            </div>

                            {/* Filter */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="w-full sm:w-auto flex items-center justify-between gap-3 px-5 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-white/70 hover:text-white text-sm transition-all shadow-inner hover:border-white/20"
                                >
                                    <div className="flex items-center gap-2">
                                        <Filter size={14} className="text-visio-teal" />
                                        <span className="font-medium">{selectedIndustry === 'all' ? 'All Industries' : selectedIndustry}</span>
                                    </div>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                                </button>
                                
                                <AnimatePresence>
                                    {showFilters && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                            className="absolute top-full mt-2 right-0 w-64 max-h-80 overflow-y-auto custom-scrollbar bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 p-2"
                                        >
                                            <button
                                                onClick={() => { setSelectedIndustry('all'); setShowFilters(false); setVisibleCount(ITEMS_PER_PAGE); }}
                                                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${selectedIndustry === 'all' ? 'bg-visio-teal/15 text-visio-teal font-medium' : 'text-white/70 hover:bg-white/10'}`}
                                            >
                                                All Industries <span className="text-xs opacity-50 ml-1">({contacts.length})</span>
                                            </button>
                                            <div className="h-px bg-white/5 my-1 mx-2" />
                                            {industries.map(ind => {
                                                const count = contacts.filter(c => c.industry === ind).length;
                                                return (
                                                    <button
                                                        key={ind}
                                                        onClick={() => { setSelectedIndustry(ind); setShowFilters(false); setVisibleCount(ITEMS_PER_PAGE); }}
                                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${selectedIndustry === ind ? 'bg-visio-teal/15 text-visio-teal font-medium' : 'text-white/70 hover:bg-white/10'}`}
                                                    >
                                                        {ind} <span className="text-xs opacity-50 ml-1">({count})</span>
                                                    </button>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Export buttons */}
                            <div className="flex items-center gap-2 bg-black/40 p-1 border border-white/10 rounded-2xl shadow-inner">
                                <button
                                    onClick={handleCopyMD}
                                    className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all"
                                    title="Copy contacts as Markdown"
                                >
                                    {copied ? <Check size={16} className="text-visio-teal" /> : <Copy size={16} />}
                                </button>
                                <div className="w-px h-5 bg-white/10" />
                                <button
                                    onClick={handleDownloadMD}
                                    className="flex items-center gap-1.5 px-3 h-10 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all text-sm font-medium"
                                    title="Download as Markdown"
                                >
                                    <Download size={14} />
                                    <span className="hidden xl:inline">MD</span>
                                </button>
                                <button
                                    onClick={handleDownloadCSV}
                                    className="flex items-center gap-1.5 px-3 h-10 bg-visio-teal/15 hover:bg-visio-teal/25 border border-visio-teal/20 rounded-xl text-visio-teal transition-all text-sm font-medium shadow-sm"
                                    title="Download as CSV"
                                >
                                    <Download size={14} />
                                    <span className="hidden xl:inline">CSV</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {activeTab === 'tools' ? (
                    /* AI Tools Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {AI_TOOLS.map((tool, i) => (
                            <motion.button
                                key={i}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.04 * i }}
                                onClick={onNewChat}
                                className="flex flex-col p-6 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:bg-white/[0.04] hover:border-white/10 hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1 transition-all duration-300 text-left group"
                            >
                                <div className="flex items-center justify-between w-full mb-4">
                                    <div className={`p-3.5 rounded-2xl ${tool.bg} ring-1 ring-white/5 group-hover:scale-110 transition-transform duration-300`}>
                                        <tool.icon size={22} className={tool.color} />
                                    </div>
                                    <span className="text-[11px] font-medium text-white/40 flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 shadow-inner">
                                        <Coins size={12} className="text-amber-400" />{tool.credits} cr
                                    </span>
                                </div>
                                <h4 className="text-base font-bold text-white group-hover:text-visio-teal transition-colors mb-2">{tool.name}</h4>
                                <p className="text-sm text-white/50 leading-relaxed">{tool.description}</p>
                            </motion.button>
                        ))}
                    </div>
                ) : (
                    /* Pages & Contacts */
                    <div className="space-y-6">
                        {/* CTA: Send Your Music */}
                        <motion.button
                            onClick={() => setShowSubmissionModal(true)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.005 }}
                            whileTap={{ scale: 0.995 }}
                            className="w-full relative overflow-hidden rounded-3xl border border-visio-teal/30 bg-gradient-to-r from-visio-teal/10 via-purple-500/10 to-pink-500/10 hover:from-visio-teal/15 hover:via-purple-500/15 hover:to-pink-500/15 transition-all duration-500 group shadow-lg shadow-visio-teal/5"
                        >
                            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:px-8 sm:py-6 relative z-10 gap-4 sm:gap-0">
                                <div className="flex items-center gap-5">
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-visio-teal/20 to-purple-500/20 border border-visio-teal/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner">
                                        <Music size={26} className="text-visio-teal drop-shadow-md" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-visio-teal transition-colors tracking-wide">
                                            Want to pitch your music to 100+ influential media pages?
                                        </h3>
                                        <p className="text-sm text-white/60 mt-1">
                                            We&apos;ll craft and distribute your pitch to top curators across South Africa — <span className="text-amber-400 font-semibold">$10</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                                    <span className="text-sm font-semibold text-visio-teal bg-visio-teal/10 px-5 py-2.5 rounded-xl border border-visio-teal/20 shadow-sm">
                                        Start Pitch
                                    </span>
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-visio-teal group-hover:text-black text-white/50 transition-all duration-300">
                                        <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </div>
                            {/* Animated gradient line */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-visio-teal via-purple-500 to-pink-500 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                        </motion.button>

                        {/* Results count header */}
                        <div className="flex items-center justify-between px-2">
                            <p className="text-sm font-medium text-white/40">{filtered.length} pages found</p>
                            <span className="text-xs font-medium text-white/30 flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                                <Lock size={12} /> Full contact info available on export
                            </span>
                        </div>

                        {/* Pages Grid */}
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {[...Array(18)].map((_, i) => (
                                    <div key={i} className="flex flex-col items-center gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-3xl animate-pulse">
                                        <div className="w-16 h-16 rounded-full bg-white/5" />
                                        <div className="w-24 h-4 bg-white/5 rounded-md" />
                                        <div className="w-16 h-3 bg-white/5 rounded-md" />
                                    </div>
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                className="bg-white/[0.02] border border-white/5 rounded-3xl p-16 text-center shadow-inner"
                            >
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-5">
                                    <Users size={32} className="text-white/20" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">No pages found</h3>
                                <p className="text-white/40 text-sm max-w-sm mx-auto">Try adjusting your search query or removing filters to see more results.</p>
                            </motion.div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {visibleContacts.map((contact, i) => {
                                        const isExpanded = expandedId === contact.id;
                                        return (
                                            <motion.div
                                                key={contact.id}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ 
                                                    opacity: { delay: Math.min(i * 0.015, 0.4) }, 
                                                    y: { delay: Math.min(i * 0.015, 0.4) },
                                                    layout: { type: 'spring', stiffness: 300, damping: 30 } 
                                                }}
                                                onClick={() => handleCardClick(contact.id)}
                                                className={`relative flex flex-col items-center p-5 rounded-3xl cursor-pointer transition-all duration-300 group overflow-hidden
                                                    ${isExpanded
                                                        ? 'bg-gradient-to-b from-white/[0.08] to-white/[0.04] border-visio-teal/40 border shadow-2xl shadow-visio-teal/10 col-span-2 row-span-2 sm:col-span-2 z-10'
                                                        : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/15 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-1'
                                                    }`}
                                            >
                                                {/* Profile Avatar Bubble */}
                                                <div className={`relative mb-4 ${isExpanded ? 'w-24 h-24' : 'w-16 h-16'} transition-all duration-300 shrink-0`}>
                                                    {contact.profilePic ? (
                                                        <img
                                                            src={contact.profilePic}
                                                            alt={contact.person}
                                                            className={`w-full h-full rounded-full object-cover shadow-lg ring-2 ring-white/10 group-hover:ring-white/20 transition-all`}
                                                            onError={(e) => {
                                                                const target = e.currentTarget;
                                                                target.style.display = 'none';
                                                                const fallback = target.nextElementSibling as HTMLElement;
                                                                if (fallback) fallback.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div
                                                        className={`w-full h-full rounded-full ${getGradient(contact.person)} items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/5 group-hover:ring-white/20 transition-all ${isExpanded ? 'text-2xl' : 'text-lg'}`}
                                                        style={{ display: contact.profilePic ? 'none' : 'flex' }}
                                                    >
                                                        {getInitials(contact.person)}
                                                    </div>
                                                    
                                                    {/* Verified badge */}
                                                    {contact.status === 'Verified' && (
                                                        <div className={`absolute ${isExpanded ? 'bottom-0 right-0 w-7 h-7' : '-bottom-0.5 -right-0.5 w-5 h-5'} bg-visio-teal rounded-full flex items-center justify-center border-2 border-[#111] shadow-sm transition-all duration-300`}>
                                                            <Check size={isExpanded ? 14 : 10} className="text-[#111]" strokeWidth={3} />
                                                        </div>
                                                    )}
                                                    
                                                    {/* Online-style dot for follower count */}
                                                    {contact.followers && (
                                                        <div className={`absolute ${isExpanded ? '-top-1 -right-1 px-2.5 py-1' : '-top-1 -right-1 px-1.5 py-0.5'} bg-[#111]/90 backdrop-blur-md border border-white/10 rounded-full shadow-lg transition-all duration-300 z-10`}>
                                                            <span className={`${isExpanded ? 'text-[10px]' : 'text-[8px]'} text-white/90 font-bold tracking-wider`}>{contact.followers}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Name */}
                                                <h4 className={`font-bold text-white text-center leading-tight mb-1.5 group-hover:text-visio-teal transition-colors ${isExpanded ? 'text-lg' : 'text-sm'} px-2`}>
                                                    {contact.person}
                                                </h4>

                                                {/* Industry Tag */}
                                                <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-black/40 border border-white/5 text-white/50 mb-3 truncate max-w-[90%] shadow-inner">
                                                    {contact.industry || contact.title}
                                                </span>

                                                {/* Social Platform Icons */}
                                                {!isExpanded && hasSocials(contact) && (
                                                    <div className="flex items-center gap-2">
                                                        {contact.instagram && (
                                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] flex items-center justify-center shadow-md">
                                                                <Instagram size={12} className="text-white" />
                                                            </div>
                                                        )}
                                                        {contact.tiktok && (
                                                            <div className="w-6 h-6 rounded-full bg-black border border-white/10 flex items-center justify-center shadow-md">
                                                                <TikTokIcon size={12} className="text-white" />
                                                            </div>
                                                        )}
                                                        {contact.twitter && (
                                                            <div className="w-6 h-6 rounded-full bg-black border border-white/10 flex items-center justify-center shadow-md">
                                                                <XIcon size={12} className="text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Expanded Details */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0, y: 10 }}
                                                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                                                            exit={{ opacity: 0, height: 0, y: 10 }}
                                                            className="w-full mt-2 pt-4 border-t border-white/10 space-y-3 overflow-hidden"
                                                        >
                                                            <div className="bg-black/20 rounded-2xl p-3 border border-white/5 space-y-2.5 shadow-inner">
                                                                {contact.company && contact.company !== contact.person && (
                                                                    <div className="flex items-center gap-2.5 text-xs text-white/60">
                                                                        <Globe size={14} className="text-white/40 shrink-0" />
                                                                        <span className="truncate font-medium">{contact.company}</span>
                                                                    </div>
                                                                )}
                                                                {contact.country && (
                                                                    <div className="flex items-center gap-2.5 text-xs text-white/60">
                                                                        <span className="text-base leading-none">🇿🇦</span>
                                                                        <span className="font-medium">{contact.country === 'ZA' ? 'South Africa' : contact.country}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="bg-black/20 rounded-2xl p-3 border border-white/5 space-y-2.5 shadow-inner">
                                                                {contact.instagram && (
                                                                    <div className="flex items-center gap-2.5 text-xs">
                                                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] flex items-center justify-center shrink-0">
                                                                            <Instagram size={10} className="text-white" />
                                                                        </div>
                                                                        <span className="truncate text-white/80 font-medium">@{contact.realInstagram || contact.instagram}</span>
                                                                    </div>
                                                                )}
                                                                {contact.tiktok && (
                                                                    <div className="flex items-center gap-2.5 text-xs">
                                                                        <div className="w-5 h-5 rounded-full bg-black border border-white/20 flex items-center justify-center shrink-0">
                                                                            <TikTokIcon size={10} className="text-white" />
                                                                        </div>
                                                                        <span className="truncate text-white/80 font-medium">@{contact.tiktok}</span>
                                                                    </div>
                                                                )}
                                                                {contact.twitter && (
                                                                    <div className="flex items-center gap-2.5 text-xs">
                                                                        <div className="w-5 h-5 rounded-full bg-black border border-white/20 flex items-center justify-center shrink-0">
                                                                            <XIcon size={10} className="text-white" />
                                                                        </div>
                                                                        <span className="truncate text-white/80 font-medium">@{contact.twitter}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {contact.dateAdded && (
                                                                <p className="text-[10px] font-medium text-white/30 text-center pt-2">Added {contact.dateAdded}</p>
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
                                    <div className="flex justify-center pt-8 pb-4">
                                        <button
                                            onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                                            className="px-8 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 hover:shadow-lg transition-all"
                                        >
                                            Load more ({filtered.length - visibleCount} remaining)
                                        </button>
                                    </div>
                                )}

                                {/* Premium CTA Banner */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="mt-12 relative overflow-hidden rounded-3xl border border-visio-teal/20 bg-black p-8 sm:p-10 shadow-2xl"
                                >
                                    {/* Fancy background gradients */}
                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-visio-teal/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
                                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3" />
                                    
                                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-10 text-center md:text-left">
                                        <div className="flex-shrink-0 w-16 h-16 rounded-3xl bg-gradient-to-br from-visio-teal/20 to-emerald-500/20 border border-visio-teal/30 flex items-center justify-center shadow-lg shadow-visio-teal/10">
                                            <Zap size={32} className="text-visio-teal drop-shadow-md" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-2xl font-outfit font-bold text-white mb-2 tracking-wide">
                                                Scale Your Lead Gen with VisioCorp
                                            </h3>
                                            <p className="text-white/60 text-base max-w-xl leading-relaxed">
                                                Unlock raw API access, automated pitching, and custom data scraping. Partner with us to dominate your niche.
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-center gap-3 w-full md:w-auto shrink-0">
                                            <a
                                                href="mailto:admin@visiocorp.co"
                                                className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-100 hover:scale-[1.02] transition-all shadow-xl shadow-white/10"
                                            >
                                                <Mail size={18} />
                                                Partner With Us
                                            </a>
                                            <span className="text-[11px] font-medium text-white/40 tracking-wider uppercase">admin@visiocorp.co</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
