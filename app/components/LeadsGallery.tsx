import React, { useState } from 'react';
import { Lead } from '../types';
import { LeadCard } from './LeadCard';
import { Search, Filter, Download, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeadsGalleryProps {
    leads: Lead[];
    onSaveLead: (lead: Lead) => void;
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export const LeadsGallery: React.FC<LeadsGalleryProps> = ({ leads, onSaveLead }) => {
    const [copied, setCopied] = useState(false);

    const generateMarkdown = () => {
        const date = new Date().toLocaleDateString();
        let md = `# Visio Leads Export\nDate: ${date}\nTotal Leads: ${leads.length}\n\n## Contact List\n\n`;

        leads.forEach(lead => {
            md += `### ${lead.name}\n`;
            md += `- **Role:** ${lead.title}\n`;
            md += `- **Company:** ${lead.company || 'N/A'}\n`;
            md += `- **Email:** ${lead.email || 'N/A'}\n`;
            md += `- **LinkedIn:** ${lead.socials?.linkedin || 'N/A'}\n`;
            md += `- **Match Score:** ${lead.matchScore}%\n`;
            md += `- **Summary:** ${lead.snippet || 'No summary available'}\n\n`;
            md += `---\n\n`;
        });

        return md;
    };

    const handleDownload = () => {
        const md = generateMarkdown();
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visio-leads-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCopy = () => {
        const md = generateMarkdown();
        navigator.clipboard.writeText(md);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full w-full">

            {/* Header */}
            <div className="sticky top-0 z-20 bg-visio-bg/80 backdrop-blur-md border-b border-white/5 p-6">
                <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">My Leads</h2>
                        <p className="text-sm text-white/40">Found {leads.length} contacts across all campaigns.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-visio-teal transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search leads..."
                                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-visio-teal/50 transition-colors w-64"
                            />
                        </div>

                        {/* Export Actions */}
                        <div className="flex items-center gap-1 pl-2 border-l border-white/10 ml-2">
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors text-sm font-medium"
                                title="Copy Markdown to Clipboard"
                            >
                                {copied ? <Check size={16} className="text-visio-teal" /> : <Copy size={16} />}
                                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy MD'}</span>
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium text-sm transition-colors"
                                title="Download Markdown File"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline">Export MD</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
                >
                    {leads.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <Search size={24} className="text-white/20" />
                            </div>
                            <p className="text-white/40 text-lg">No leads found yet.</p>
                            <p className="text-white/20 text-sm">Ask Visio to find contacts to populate this list.</p>
                        </div>
                    ) : (
                        leads.map(lead => (
                            <motion.div key={lead.id} variants={item} className="flex justify-center h-full">
                                <LeadCard lead={lead} onSave={onSaveLead} />
                            </motion.div>
                        ))
                    )}
                </motion.div>
            </div>
        </div>
    );
};
