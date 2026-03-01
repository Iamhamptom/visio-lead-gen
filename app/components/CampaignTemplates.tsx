'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Instagram,
    CalendarCheck,
    Newspaper,
    BookOpen,
    Megaphone,
    Mic,
    ArrowRight,
    LayoutTemplate,
    Sparkles
} from 'lucide-react';

interface CampaignTemplate {
    id: string;
    icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
    title: string;
    description: string;
    color: string;
    bg: string;
    border: string;
    prompt: string;
    tags: string[];
}

const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
    {
        id: 'instagram-post-story',
        icon: Instagram,
        title: 'Instagram Post + Story',
        description: 'Create compelling Instagram content campaigns with coordinated posts and stories that drive engagement and grow your following.',
        color: 'text-pink-400',
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/20',
        tags: ['Social Media', 'Visual Content', 'Engagement'],
        prompt: 'I want to create an Instagram content campaign with coordinated posts and stories. Help me plan the visual theme, write captions, design a story sequence, and create a posting schedule. Ask me about my upcoming release or event so you can tailor the content.',
    },
    {
        id: 'invite-to-event',
        icon: CalendarCheck,
        title: 'Invite to Event',
        description: 'Professional event invitation templates for launch parties, listening sessions, showcases, and industry networking events.',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        tags: ['Events', 'Outreach', 'Networking'],
        prompt: 'I need to create event invitation outreach for an upcoming event. Help me draft invitation messages for different audiences (industry contacts, press, fans, VIPs), create an RSVP tracking plan, and suggest follow-up sequences. Ask me about the event details so you can personalize everything.',
    },
    {
        id: 'newsletter',
        icon: Newspaper,
        title: 'Newsletter',
        description: 'Engaging newsletter templates to keep your fanbase informed about releases, tours, behind-the-scenes content, and milestones.',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        tags: ['Email', 'Fan Engagement', 'Updates'],
        prompt: 'Help me create a newsletter campaign for my fanbase. I need a newsletter template that includes sections for new music updates, upcoming events, behind-the-scenes content, and a personal message. Guide me through the content and suggest a sending cadence.',
    },
    {
        id: 'introductory-pack',
        icon: BookOpen,
        title: 'Introductory Pack / My Story',
        description: 'Personal branding introduction templates that tell your story compellingly to new contacts, press, and potential collaborators.',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        tags: ['Branding', 'Bio', 'Press Kit'],
        prompt: 'Help me create an Introductory Pack / "My Story" campaign for personal branding. I need a compelling artist bio, a press-ready one-sheet, key talking points, and templates for introducing myself to new industry contacts. Ask me about my background, achievements, and vision so you can craft an authentic narrative.',
    },
    {
        id: 'call-to-action',
        icon: Megaphone,
        title: 'Call To Action Templates',
        description: 'Powerful CTA campaigns like "Help Me Reach Billboard Charts" that mobilize your fanbase and drive measurable results.',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        tags: ['Fan Activation', 'Streaming', 'Charts'],
        prompt: 'Help me create a Call To Action campaign to mobilize my fanbase, similar to "Help Me Reach the Billboard Charts." I need compelling messaging, step-by-step instructions for fans, social media post templates, and a timeline for the push. Ask me about my specific goal so we can make it targeted and achievable.',
    },
    {
        id: 'outreach-promoters',
        icon: Mic,
        title: 'Outreach to Promoters',
        description: 'Outreach templates for event promoters and bookers — "Let Me Bring the Party to You" — get booked for gigs and events.',
        color: 'text-teal-400',
        bg: 'bg-teal-500/10',
        border: 'border-teal-500/20',
        tags: ['Booking', 'Live Shows', 'Promoters'],
        prompt: 'Help me create an outreach campaign for event promoters and bookers, with the energy of "Let Me Bring the Party to You." I need pitch templates for different venue types, a highlight reel talking points list, pricing/availability templates, and follow-up sequences. Ask me about my performance style and availability so we can customize the pitch.',
    },
];

interface CampaignTemplatesProps {
    onUseTemplate: (prompt: string) => void;
}

export const CampaignTemplates: React.FC<CampaignTemplatesProps> = ({ onUseTemplate }) => {
    return (
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 md:py-12">
            <div className="max-w-6xl mx-auto space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="space-y-4"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                            <Sparkles size={14} className="text-visio-accent" />
                            <span className="text-xs font-medium text-white/80 uppercase tracking-widest">Growth Engine</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-light text-white tracking-tight">
                            Campaign <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">Blueprints</span>
                        </h1>
                        <p className="text-white/50 text-base md:text-lg max-w-2xl leading-relaxed">
                            Deploy proven frameworks tailored for artists. Select a blueprint, and Visio will construct a fully customized campaign strategy.
                        </p>
                    </motion.div>
                </div>

                {/* Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {CAMPAIGN_TEMPLATES.length === 0 ? (
                        /* Empty State */
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-white/[0.02] border border-white/[0.05] rounded-3xl border-dashed"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
                                <LayoutTemplate size={28} className="text-white/20" />
                            </div>
                            <h3 className="text-xl font-medium text-white mb-2">No Blueprints Available</h3>
                            <p className="text-white/40 text-sm max-w-sm">
                                Check back later for new campaign templates to fuel your growth.
                            </p>
                        </motion.div>
                    ) : (
                        CAMPAIGN_TEMPLATES.map((template, index) => (
                            <motion.div
                                key={template.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.08, duration: 0.5, ease: "easeOut" }}
                                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                                className="group relative flex flex-col bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] rounded-3xl p-7 hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md shadow-2xl shadow-black/10"
                                onClick={() => onUseTemplate(template.prompt)}
                            >
                                {/* Background Ambient Glow */}
                                <div className={`absolute -top-24 -right-24 w-56 h-56 ${template.bg} rounded-full blur-[70px] opacity-30 group-hover:opacity-70 transition-opacity duration-700 pointer-events-none`} />
                                
                                <div className="relative z-10 flex flex-col h-full">
                                    {/* Icon & Tags */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div className={`p-3.5 rounded-2xl ${template.bg} border ${template.border} shadow-inner`}>
                                            <template.icon size={24} className={template.color} strokeWidth={1.5} />
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-1.5 max-w-[55%]">
                                            {template.tags.slice(0, 2).map(tag => (
                                                <span
                                                    key={tag}
                                                    className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.03] text-white/60 border border-white/10 backdrop-blur-md whitespace-nowrap"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {template.tags.length > 2 && (
                                                <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.03] text-white/60 border border-white/10 backdrop-blur-md">
                                                    +{template.tags.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Text Content */}
                                    <h3 className="text-xl font-medium text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 transition-all duration-300">
                                        {template.title}
                                    </h3>
                                    <p className="text-sm text-white/50 leading-relaxed mb-8 flex-grow">
                                        {template.description}
                                    </p>

                                    {/* Footer / CTA */}
                                    <div className="pt-5 mt-auto border-t border-white/[0.06] flex items-center justify-between group-hover:border-white/[0.15] transition-colors duration-300">
                                        <span className="text-sm font-medium text-white/60 group-hover:text-white transition-colors">
                                            Launch Blueprint
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all duration-300 shadow-sm">
                                            <ArrowRight size={14} className="text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
