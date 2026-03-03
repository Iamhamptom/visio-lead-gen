'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Disc3,
    Radio,
    ListMusic,
    Newspaper,
    PenLine,
    Video,
    Music4,
    Youtube,
    Headphones,
    PartyPopper,
    Building2,
    CalendarPlus,
    Handshake,
    Podcast,
    Megaphone,
    ArrowRight,
    LayoutTemplate,
    Sparkles,
    Globe,
    Users,
    Search,
    SlidersHorizontal,
    X,
    ChevronDown,
    Coins,
} from 'lucide-react';
import {
    GlobalGeographySelector,
    GeographySelection,
    formatGeographyForPrompt,
    DEFAULT_GEOGRAPHY,
} from './GlobalGeographySelector';

// ─── Types ─────────────────────────────────────────────────────────
export type ListSize = 30 | 50 | 100;

export interface GlobalTemplate {
    id: string;
    icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
    title: string;
    description: string;
    color: string;
    bg: string;
    border: string;
    glowColor: string;
    category: TemplateCategory;
    tags: string[];
    roleType: string;
    baseCredits: number; // per lead
    buildPrompt: (geo: string, listSize: number, genre?: string) => string;
}

export type TemplateCategory = 'music_industry' | 'media_press' | 'digital_creators' | 'events_venues' | 'growth_brand';

const CATEGORY_CONFIG: Record<TemplateCategory, { label: string; icon: React.FC<{ size?: number; className?: string }> }> = {
    music_industry: { label: 'Music Industry', icon: Music4 },
    media_press: { label: 'Media & Press', icon: Newspaper },
    digital_creators: { label: 'Digital Creators', icon: Video },
    events_venues: { label: 'Events & Venues', icon: PartyPopper },
    growth_brand: { label: 'Growth & Brand', icon: Megaphone },
};

// ─── 15 Global-First Templates ─────────────────────────────────────
const GLOBAL_TEMPLATES: GlobalTemplate[] = [
    {
        id: 'pitch-djs',
        icon: Disc3,
        title: 'Pitch Music to DJs',
        description: 'Find DJs who play your genre and pitch your tracks for sets, mixes, and club rotation. Works for radio DJs, club DJs, and mix show hosts.',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        glowColor: 'purple',
        category: 'music_industry',
        tags: ['DJs', 'Club', 'Mixes'],
        roleType: 'DJ',
        baseCredits: 2,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} DJs ${geo} who actively play and promote new music. I need DJs across clubs, radio, and online mix shows. For each DJ, find their name, location, genre focus, social handles, email if available, and an estimated audience size. Focus on DJs who are open to receiving new tracks and have active followings. Format as a lead list with contact details.`,
    },
    {
        id: 'pitch-radio',
        icon: Radio,
        title: 'Pitch Music to Radio',
        description: 'Connect with radio stations, show hosts, and music directors to get your tracks on air. Covers commercial, community, and online radio.',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        glowColor: 'blue',
        category: 'music_industry',
        tags: ['Radio', 'Airplay', 'Stations'],
        roleType: 'Radio',
        baseCredits: 2,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} radio contacts ${geo} — including station music directors, show hosts, and playlist curators at FM, community, and online radio stations. I need their name, station name, show name, genre focus, submission email or contact method, and social handles. Prioritize stations that actively feature independent and emerging artists.`,
    },
    {
        id: 'pitch-playlist-curators',
        icon: ListMusic,
        title: 'Pitch to Playlist Curators',
        description: 'Reach Spotify, Apple Music, and YouTube playlist curators who can feature your tracks and boost your streaming numbers.',
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        glowColor: 'green',
        category: 'music_industry',
        tags: ['Playlists', 'Spotify', 'Streaming'],
        roleType: 'Playlist Curator',
        baseCredits: 2,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} playlist curators ${geo} across Spotify, Apple Music, YouTube Music, and Deezer. I need curators who manage playlists in my genre with significant follower counts. For each, provide their name, platform, playlist names, follower/subscriber counts, genre tags, submission method, and social handles. Prioritize curators known for supporting independent artists.`,
    },
    {
        id: 'press-journalists',
        icon: Newspaper,
        title: 'Press Release Blast to Journalists',
        description: 'Target music journalists, editors, and writers at publications who cover your genre for reviews, features, and interviews.',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        glowColor: 'amber',
        category: 'media_press',
        tags: ['Press', 'Journalists', 'Reviews'],
        roleType: 'Journalist',
        baseCredits: 2,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} music journalists and editors ${geo} who write about my genre. Include writers at major publications, indie magazines, and online music outlets. For each, provide their name, publication, beat/genre focus, email, social handles, and recent articles. Focus on journalists who actively review new releases and feature emerging artists.`,
    },
    {
        id: 'blog-review',
        icon: PenLine,
        title: 'Blog & Review Outreach',
        description: 'Get featured on influential music blogs and review sites that can amplify your release to dedicated music fans.',
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        glowColor: 'rose',
        category: 'media_press',
        tags: ['Blogs', 'Reviews', 'Features'],
        roleType: 'Blogger',
        baseCredits: 2,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} music blogs and review sites ${geo} that cover my genre. I need the blog name, editor/owner name, genre focus, monthly traffic estimate, submission process, email, and social handles. Prioritize active blogs that regularly publish reviews and artist features, with engaged readerships.`,
    },
    {
        id: 'tiktok-creators',
        icon: Video,
        title: 'TikTok Creator Seeding',
        description: 'Find TikTok creators who can use your music in their content and spark viral trends through dance, lip-sync, or creative videos.',
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20',
        glowColor: 'cyan',
        category: 'digital_creators',
        tags: ['TikTok', 'Viral', 'Creators'],
        roleType: 'TikTok Creator',
        baseCredits: 3,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} TikTok creators ${geo} who regularly use trending music in their content. I need creators across dance, lip-sync, lifestyle, comedy, and creative niches. For each, provide their handle, follower count, average views, content niche, engagement rate estimate, and contact method (email/DM). Prioritize creators with 10K–500K followers who actively engage with music trends.`,
    },
    {
        id: 'dancers-choreographers',
        icon: Music4,
        title: 'Dancers & Choreographers Push',
        description: 'Connect with dancers and choreographers who can create routines to your music and share them across social platforms.',
        color: 'text-pink-400',
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/20',
        glowColor: 'pink',
        category: 'digital_creators',
        tags: ['Dance', 'Choreography', 'Movement'],
        roleType: 'Dancer/Choreographer',
        baseCredits: 3,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} dancers and choreographers ${geo} who are active on social media (Instagram, TikTok, YouTube). I need their name, handles, follower counts, dance style, platforms, and contact info. Prioritize dancers who create original choreography to trending music and have engaged followings. Include both professional dance crews and individual creators.`,
    },
    {
        id: 'youtube-reactors',
        icon: Youtube,
        title: 'YouTube Reactors Push',
        description: 'Get your music featured by YouTube reaction channels and music review creators who drive discovery and engagement.',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        glowColor: 'red',
        category: 'digital_creators',
        tags: ['YouTube', 'Reactions', 'Discovery'],
        roleType: 'YouTube Reactor',
        baseCredits: 3,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} YouTube music reaction and review channels ${geo}. I need channels that react to, review, or break down music in my genre. For each, provide the channel name, subscriber count, average views, genres covered, upload frequency, contact email, and social handles. Prioritize channels with 5K–500K subscribers that feature independent artists.`,
    },
    {
        id: 'streamers-live-djs',
        icon: Headphones,
        title: 'Streamers & Live Mix Channels',
        description: 'Reach Twitch streamers, YouTube live DJs, and mix channel operators who can feature your tracks in their streams.',
        color: 'text-violet-400',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20',
        glowColor: 'violet',
        category: 'digital_creators',
        tags: ['Twitch', 'Live', 'Streaming'],
        roleType: 'Streamer',
        baseCredits: 3,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} live streamers and mix channel operators ${geo} on Twitch, YouTube Live, and Mixcloud. I need streamers who play music, DJ sets, or host music-focused streams. For each, provide their name, platform, follower/subscriber count, genre focus, stream schedule, and contact method. Prioritize streamers who feature new tracks and accept music submissions.`,
    },
    {
        id: 'promoter-outreach',
        icon: PartyPopper,
        title: 'Promoter Outreach',
        description: '"Let me bring the party to you" — connect with event promoters and booking agents who can put you on stages.',
        color: 'text-teal-400',
        bg: 'bg-teal-500/10',
        border: 'border-teal-500/20',
        glowColor: 'teal',
        category: 'events_venues',
        tags: ['Promoters', 'Booking', 'Events'],
        roleType: 'Promoter',
        baseCredits: 2,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} event promoters and booking agents ${geo} who work with artists in my genre. I need their name, company, event types they promote (festivals, club nights, concerts), genres, venues they work with, social handles, and contact info. Prioritize active promoters with a track record of hosting successful events.`,
    },
    {
        id: 'venue-booking',
        icon: Building2,
        title: 'Venue & Club Booking Outreach',
        description: 'Find venues, clubs, and live music spaces that book artists like you for gigs, residencies, and special events.',
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        glowColor: 'orange',
        category: 'events_venues',
        tags: ['Venues', 'Clubs', 'Gigs'],
        roleType: 'Venue',
        baseCredits: 2,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} music venues, clubs, and live performance spaces ${geo} that book artists in my genre. For each venue, provide the name, location, capacity, genres hosted, booking contact person, email, phone, website, and social handles. Include a mix of intimate venues, mid-size clubs, and larger spaces.`,
    },
    {
        id: 'event-listings',
        icon: CalendarPlus,
        title: 'Event Listing Submissions',
        description: 'Submit your events and shows to listing platforms, local guides, and community calendars for maximum visibility.',
        color: 'text-lime-400',
        bg: 'bg-lime-500/10',
        border: 'border-lime-500/20',
        glowColor: 'lime',
        category: 'events_venues',
        tags: ['Events', 'Listings', 'Promotion'],
        roleType: 'Event Platform',
        baseCredits: 1,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} event listing platforms, local event guides, and community calendars ${geo} where I can submit my upcoming shows and events. For each, provide the platform name, website, submission process, audience type, geographic reach, and any costs. Include both free and paid listing options.`,
    },
    {
        id: 'brand-partnership',
        icon: Handshake,
        title: 'Brand Partnership Outreach',
        description: 'Connect with brands, sponsors, and marketing agencies looking to partner with artists for campaigns and endorsements.',
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        glowColor: 'indigo',
        category: 'growth_brand',
        tags: ['Brands', 'Sponsors', 'Deals'],
        roleType: 'Brand',
        baseCredits: 3,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} brands and companies ${geo} that partner with music artists for sponsorships, endorsements, and collaborative campaigns. I need the brand name, industry, marketing contact, email, social handles, and examples of past artist partnerships. Focus on brands that align with my genre and target audience, including lifestyle, fashion, beverage, and tech brands.`,
    },
    {
        id: 'podcast-guest',
        icon: Podcast,
        title: 'Podcast Guest Outreach',
        description: 'Get booked as a guest on music, entertainment, and culture podcasts to share your story and reach new audiences.',
        color: 'text-fuchsia-400',
        bg: 'bg-fuchsia-500/10',
        border: 'border-fuchsia-500/20',
        glowColor: 'fuchsia',
        category: 'growth_brand',
        tags: ['Podcasts', 'Interviews', 'Stories'],
        roleType: 'Podcast Host',
        baseCredits: 2,
        buildPrompt: (geo, listSize) =>
            `Find me ${listSize} podcasts ${geo} that feature music artists, industry discussions, or entertainment/culture topics. For each, provide the podcast name, host name, listener count estimate, genres/topics covered, platform (Spotify, Apple, YouTube), submission or booking process, and contact info. Prioritize podcasts that regularly feature independent artists and have engaged audiences.`,
    },
    {
        id: 'fan-cta-campaign',
        icon: Megaphone,
        title: 'Fan CTA Campaign',
        description: '"Help me reach the charts" — mobilize your fanbase with coordinated streaming pushes, social campaigns, and share-to-win activations.',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/20',
        glowColor: 'yellow',
        category: 'growth_brand',
        tags: ['Fans', 'Charts', 'Activation'],
        roleType: 'Fan Campaign',
        baseCredits: 1,
        buildPrompt: (geo, listSize) =>
            `Help me create a comprehensive fan activation campaign targeted ${geo}. I need: 1) A "Help Me Reach the Charts" messaging framework with ${listSize} pre-written social posts and captions fans can share, 2) Step-by-step streaming instructions for fans, 3) A timeline for the push, 4) Share-to-win contest ideas, 5) Community group strategy. Make it feel organic and exciting, not desperate. Ask me about my specific release and goal.`,
    },
];

// ─── Exported for use in suggestions ───────────────────────────────
export { GLOBAL_TEMPLATES };
export type { GeographySelection };

// ─── Component ─────────────────────────────────────────────────────
interface CampaignTemplatesProps {
    onUseTemplate: (prompt: string) => void;
}

export const CampaignTemplates: React.FC<CampaignTemplatesProps> = ({ onUseTemplate }) => {
    const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    // Per-card geography + list size state
    const [cardGeo, setCardGeo] = useState<Record<string, GeographySelection>>({});
    const [cardListSize, setCardListSize] = useState<Record<string, ListSize>>({});

    const getGeo = (id: string) => cardGeo[id] || DEFAULT_GEOGRAPHY;
    const getListSize = (id: string) => cardListSize[id] || 50;

    const filteredTemplates = useMemo(() => {
        let templates = GLOBAL_TEMPLATES;
        if (activeCategory !== 'all') {
            templates = templates.filter(t => t.category === activeCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            templates = templates.filter(t =>
                t.title.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.tags.some(tag => tag.toLowerCase().includes(q)) ||
                t.roleType.toLowerCase().includes(q)
            );
        }
        return templates;
    }, [activeCategory, searchQuery]);

    const handleLaunch = (template: GlobalTemplate) => {
        const geo = getGeo(template.id);
        const listSize = getListSize(template.id);
        const geoString = formatGeographyForPrompt(geo);
        const prompt = template.buildPrompt(geoString, listSize);
        onUseTemplate(prompt);
    };

    const estimateCredits = (template: GlobalTemplate, id: string) => {
        return template.baseCredits * getListSize(id);
    };

    return (
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 md:py-12">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* ─── Header ─────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="space-y-4"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <Sparkles size={14} className="text-visio-accent" />
                        <span className="text-xs font-medium text-white/80 uppercase tracking-widest">Global Growth Engine</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-light text-white tracking-tight">
                        Campaign <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">Blueprints</span>
                    </h1>
                    <p className="text-white/50 text-base md:text-lg max-w-3xl leading-relaxed">
                        15 proven outreach frameworks that work anywhere in the world. Pick a role, choose your geography, set your list size — and launch.
                    </p>
                </motion.div>

                {/* ─── Filters Bar ─────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* Category Pills */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                                activeCategory === 'all'
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70'
                            }`}
                        >
                            All ({GLOBAL_TEMPLATES.length})
                        </button>
                        {(Object.entries(CATEGORY_CONFIG) as [TemplateCategory, typeof CATEGORY_CONFIG[TemplateCategory]][]).map(([key, config]) => {
                            const count = GLOBAL_TEMPLATES.filter(t => t.category === key).length;
                            const Icon = config.icon;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setActiveCategory(key)}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                                        activeCategory === key
                                            ? 'bg-white/10 text-white border border-white/20'
                                            : 'bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70'
                                    }`}
                                >
                                    <Icon size={12} />
                                    {config.label} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Search */}
                    <div className="relative ml-auto w-full sm:w-auto">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search templates..."
                            className="w-full sm:w-[220px] pl-9 pr-8 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-white/30 outline-none focus:border-white/20 transition-colors"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── Grid ───────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredTemplates.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-white/[0.02] border border-white/[0.05] rounded-3xl border-dashed"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
                                <LayoutTemplate size={28} className="text-white/20" />
                            </div>
                            <h3 className="text-xl font-medium text-white mb-2">No Templates Found</h3>
                            <p className="text-white/40 text-sm max-w-sm">
                                Try a different search term or category filter.
                            </p>
                        </motion.div>
                    ) : (
                        filteredTemplates.map((template, index) => {
                            const isExpanded = expandedCard === template.id;
                            const geo = getGeo(template.id);
                            const listSize = getListSize(template.id);
                            const credits = estimateCredits(template, template.id);

                            return (
                                <motion.div
                                    key={template.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04, duration: 0.4, ease: 'easeOut' }}
                                    className="group relative flex flex-col bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] rounded-3xl hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 overflow-hidden backdrop-blur-md shadow-2xl shadow-black/10"
                                >
                                    {/* Ambient Glow */}
                                    <div className={`absolute -top-24 -right-24 w-56 h-56 ${template.bg} rounded-full blur-[70px] opacity-20 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none`} />

                                    <div className="relative z-10 flex flex-col h-full p-6">
                                        {/* Top Row: Icon + Tags */}
                                        <div className="flex items-start justify-between mb-5">
                                            <div className={`p-3 rounded-2xl ${template.bg} border ${template.border} shadow-inner`}>
                                                <template.icon size={22} className={template.color} strokeWidth={1.5} />
                                            </div>
                                            <div className="flex flex-wrap justify-end gap-1.5 max-w-[60%]">
                                                {template.tags.map(tag => (
                                                    <span
                                                        key={tag}
                                                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] text-white/50 border border-white/[0.08] backdrop-blur-md whitespace-nowrap"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Title + Description */}
                                        <h3 className="text-lg font-medium text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 transition-all duration-300">
                                            {template.title}
                                        </h3>
                                        <p className="text-[13px] text-white/45 leading-relaxed mb-5 flex-grow">
                                            {template.description}
                                        </p>

                                        {/* Global Badge */}
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-visio-teal/8 border border-visio-teal/15 text-visio-teal/80">
                                                <Globe size={11} />
                                                <span className="text-[10px] font-medium">Works: Worldwide</span>
                                            </div>
                                            <span className="text-[10px] text-white/30">choose region below</span>
                                        </div>

                                        {/* ── Configuration Panel ─── */}
                                        <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                                            {/* Geography + List Size Row */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <GlobalGeographySelector
                                                    value={geo}
                                                    onChange={(newGeo) => setCardGeo(prev => ({ ...prev, [template.id]: newGeo }))}
                                                    compact
                                                />
                                                {/* List Size Selector */}
                                                <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-0.5">
                                                    {([30, 50, 100] as ListSize[]).map(size => (
                                                        <button
                                                            key={size}
                                                            onClick={() => setCardListSize(prev => ({ ...prev, [template.id]: size }))}
                                                            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                                                                listSize === size
                                                                    ? 'bg-white/10 text-white'
                                                                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                                                            }`}
                                                        >
                                                            {size}
                                                        </button>
                                                    ))}
                                                    <span className="text-[10px] text-white/25 px-1">leads</span>
                                                </div>
                                            </div>

                                            {/* Credits Estimate + Launch */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                                                    <Coins size={12} className="text-yellow-500/60" />
                                                    <span>~{credits} credits</span>
                                                </div>
                                                <button
                                                    onClick={() => handleLaunch(template)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/[0.18] text-sm font-medium text-white/70 hover:text-white transition-all duration-200 group/btn"
                                                >
                                                    <span>Launch</span>
                                                    <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
