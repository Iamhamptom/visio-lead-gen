import React, { useState } from 'react';
import { Lead } from '../types';
import { LeadCard } from './LeadCard';
import { Search, Filter, Download, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeadsGalleryProps {
    leads: Lead[];
    onSaveLead: (lead: Lead) => void;
    isRestricted?: boolean;
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

export const LeadsGallery: React.FC<LeadsGalleryProps> = ({ leads, onSaveLead, isRestricted = false }) => {
    const [copied, setCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredLeads = leads.filter(lead =>
        searchQuery ? (
            lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.title?.toLowerCase().includes(searchQuery.toLowerCase())
        ) : true
    );

    const generateMarkdown = () => {
        const date = new Date().toLocaleDateString();
        // Export ALL leads or just filtered? Let's export what is visible.
        const listToExport = searchQuery ? filteredLeads : leads;
        let md = `# Visio Leads Export\nDate: ${date}\nTotal Leads: ${listToExport.length}\n\n## Contact List\n\n`;

        listToExport.forEach(lead => {
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
                        <p className="text-sm text-white/40">Found {filteredLeads.length} contacts {searchQuery ? '(filtered)' : 'across all campaigns'}.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-visio-teal transition-colors" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
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
                    key={searchQuery} // Re-animate on search
                    className={`max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 relative ${isRestricted ? 'blur-sm pointer-events-none select-none' : ''}`}
                >
                    {isRestricted && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto">
                            {/* Overlay handled outside the blurred container usually but here it's easier to put sibling */}
                        </div>
                    )}
                    {filteredLeads.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <Search size={24} className="text-white/20" />
                            </div>
                            <p className="text-white/40 text-lg">No leads found.</p>
                            <p className="text-white/20 text-sm">
                                {searchQuery ? 'Try a different search term.' : 'Ask Visio to find contacts to populate this list.'}
                            </p>
                        </div>
                    ) : (
                        filteredLeads.map(lead => (
                            <motion.div key={lead.id} variants={item} className="flex justify-center h-full">
                                <LeadCard lead={lead} onSave={onSaveLead} />
                            </motion.div>
                        ))
                    )}
                </motion.div>


                {isRestricted && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center">
                        <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl text-center max-w-md mx-4 shadow-2xl">
                            <div className="w-16 h-16 rounded-full bg-visio-teal/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-visio-teal/30">
                                <Search className="text-visio-teal w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Results Hidden</h3>
                            <p className="text-white/60 mb-6">
                                Your account is currently in Preview Mode. Please wait for admin approval to view full lead generation results.
                            </p>
                            <button className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors pointer-events-auto">
                                Refresh Status
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
