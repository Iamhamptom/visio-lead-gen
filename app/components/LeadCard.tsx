import React, { useState } from 'react';
import { Lead } from '../types';
import { motion } from 'framer-motion';
import {
    Instagram,
    Linkedin,
    Twitter,
    Mail,
    Phone,
    Download,
    Plus,
    Check,
    Video,
    Send
} from 'lucide-react';
import { cn } from '@/lib/utils'; // Using our new utility
import { ShinyButton } from './ui/ShinyButton'; // Showing off our new tool

interface LeadCardProps {
    lead: Lead;
    onSave?: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onSave }) => {
    const [isSaved, setIsSaved] = useState(false);

    const handleExport = () => {
        const headers = "Name,Title,Company,Email,Phone\n";
        const row = `${lead.name},${lead.title},${lead.company || ''},${lead.email || ''},${lead.phone || ''}`;
        const csvContent = "data:text/csv;charset=utf-8," + headers + row;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${lead.name.replace(' ', '_')}_lead.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSave = () => {
        setIsSaved(true);
        if (onSave) onSave(lead);
    };

    return (
        <motion.div
            whileHover={{ y: -5, scale: 1.01 }}
            className="group relative w-full max-w-md my-4 h-full"
        >
            {/* Glow Effect behind card - Enhanced for Premium Feel */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-visio-teal to-visio-accent rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition duration-700"></div>

            {/* Main Card Content - Glassmorphism Level Up */}
            <div className="relative h-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-5 flex flex-col gap-4 overflow-hidden shadow-xl ring-1 ring-white/5">

                {/* Subtle internal shine */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                {/* Header: Avatar + Info + Score */}
                <div className="relative flex items-start justify-between z-10">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/10 ring-2 ring-black/20 group-hover:border-visio-teal/50 transition-colors duration-300">
                                <img
                                    src={lead.imageUrl || `https://picsum.photos/seed/${lead.id}/200`}
                                    alt={lead.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-visio-bg rounded-full p-1">
                                <div className="w-3 h-3 bg-visio-accent rounded-full border border-black animate-pulse"></div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-white font-semibold text-lg leading-tight group-hover:text-visio-accent transition-colors duration-300">{lead.name}</h3>
                            <p className="text-white/60 text-sm font-medium">{lead.title}</p>
                            {lead.company && <p className="text-visio-teal text-xs tracking-wide">{lead.company}</p>}
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 bg-visio-teal/10 rounded-full px-2 py-1 border border-visio-teal/20 shadow-[0_0_10px_rgba(96,138,148,0.2)]">
                            <span className="text-xs text-visio-teal/80">Match</span>
                            <span className="text-sm font-bold text-visio-accent">{lead.matchScore}%</span>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="relative h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-1"></div>

                {/* Contact Info Grid */}
                <div className="relative grid grid-cols-2 gap-2 z-10">
                    <div className="bg-black/40 rounded-lg p-2 flex items-center gap-3 border border-white/5 hover:border-white/10 transition-colors group/item">
                        <div className="p-1.5 bg-white/5 rounded-md text-visio-teal group-hover/item:text-white group-hover/item:bg-visio-teal/50 transition-all">
                            <Mail size={14} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">Email</p>
                            <p className="text-xs text-white truncate font-medium" title={lead.email}>{lead.email || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-2 flex items-center gap-3 border border-white/5 hover:border-white/10 transition-colors group/item">
                        <div className="p-1.5 bg-white/5 rounded-md text-visio-sage group-hover/item:text-white group-hover/item:bg-visio-sage/50 transition-all">
                            <Phone size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">Phone</p>
                            <p className="text-xs text-white truncate font-medium">{lead.phone || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Social Badges */}
                <div className="relative flex items-center gap-2 z-10">
                    {[
                        { link: lead.socials.instagram, icon: Instagram, color: "text-[#E1306C]" },
                        { link: lead.socials.twitter, icon: Twitter, color: "text-[#1DA1F2]" },
                        { link: lead.socials.linkedin, icon: Linkedin, color: "text-[#0077b5]" },
                        { link: lead.socials.tiktok, icon: Video, color: "text-[#ff0050]" }
                    ].map((social, i) => social.link && (
                        <a
                            key={i}
                            href={social.link.startsWith('http') ? social.link : `https://${social.link}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all border border-white/5 hover:border-white/20 hover:scale-110"
                        >
                            <social.icon size={16} className={cn("transition-colors", social.color)} />
                        </a>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="relative flex items-center gap-2 mt-auto pt-2 z-10">
                    <button
                        onClick={handleExport}
                        className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
                    >
                        <Download size={16} />
                        Export
                    </button>
                    {/* Using our Premium ShinyButton style logic for the main CTA if desired, or matching style */}
                    <button
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-visio-teal to-visio-sage text-black font-bold py-2 rounded-lg text-sm shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:shadow-[0_0_20px_rgba(45,212,191,0.4)] transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <Send size={16} />
                        Outreach
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaved}
                        className={cn(
                            "p-2 border rounded-lg transition-all active:scale-95",
                            isSaved
                                ? 'bg-visio-accent text-black border-visio-accent shadow-[0_0_15px_#B6F09C66]'
                                : 'bg-visio-teal text-white border-visio-teal shadow-lg hover:bg-visio-teal/90'
                        )}
                    >
                        {isSaved ? <Check size={18} /> : <Plus size={18} />}
                    </button>
                </div>

            </div>
        </motion.div>
    );
};
