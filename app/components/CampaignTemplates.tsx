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
} from 'lucide-react';

interface CampaignTemplate {
    id: string;
    icon: React.FC<{ size?: number; className?: string }>;
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
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-2"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-visio-teal/10 border border-visio-teal/20">
                            <LayoutTemplate size={22} className="text-visio-teal" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Campaign Templates</h1>
                    </div>
                    <p className="text-white/40 text-sm md:text-base max-w-2xl">
                        Ready-to-use campaign frameworks. Pick a template and Visio will guide you through customizing it for your goals.
                    </p>
                </motion.div>

                {/* Template Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {CAMPAIGN_TEMPLATES.map((template, index) => (
                        <motion.div
                            key={template.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08, duration: 0.4 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.07] hover:border-white/10 transition-all cursor-pointer group relative overflow-hidden"
                            onClick={() => onUseTemplate(template.prompt)}
                        >
                            {/* Glow effect */}
                            <div className={`absolute top-0 right-0 w-24 h-24 ${template.bg} rounded-full blur-[40px] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />

                            {/* Icon */}
                            <div className={`p-3 rounded-xl ${template.bg} border ${template.border} w-fit mb-4`}>
                                <template.icon size={22} className={template.color} />
                            </div>

                            {/* Content */}
                            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-visio-accent transition-colors">
                                {template.title}
                            </h3>
                            <p className="text-sm text-white/40 mb-4 line-clamp-2">
                                {template.description}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {template.tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/5"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* CTA */}
                            <div className="flex items-center gap-2 text-sm font-medium text-visio-accent group-hover:text-visio-teal transition-colors">
                                Use Template <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
