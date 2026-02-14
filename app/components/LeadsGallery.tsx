import React, { useState, useMemo } from 'react';
import { Lead } from '../types';
import { LeadCard } from './LeadCard';
import { Search, Download, Copy, Check, LayoutGrid, LayoutList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadCSV } from '@/lib/csv-export';

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

function csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

export const LeadsGallery: React.FC<LeadsGalleryProps> = ({ leads, onSaveLead, isRestricted = false }) => {
    const [copied, setCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

    const filteredLeads = leads.filter(lead =>
        searchQuery ? (
            lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.title?.toLowerCase().includes(searchQuery.toLowerCase())
        ) : true
    );

    const generateMarkdown = () => {
        const date = new Date().toLocaleDateString();
        const listToExport = searchQuery ? filteredLeads : leads;
        let md = `# V-Prai Leads Export\nDate: ${date}\nTotal Leads: ${listToExport.length}\n\n## Contact List\n\n`;

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

    const handleDownloadMD = () => {
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

    const handleDownloadCSV = () => {
        const listToExport = searchQuery ? filteredLeads : leads;
        const lines: string[] = [];
        lines.push('Name,Title,Company,Email,Phone,Followers,Country,Match Score,Instagram,TikTok,Twitter,LinkedIn,Source');
        listToExport.forEach(lead => {
            lines.push([
                csvEscape(lead.name || ''),
                csvEscape(lead.title || ''),
                csvEscape(lead.company || ''),
                csvEscape(lead.email || ''),
                csvEscape(lead.phone || ''),
                csvEscape(lead.followers || ''),
                csvEscape(lead.country || ''),
                (lead.matchScore || 0).toString(),
                csvEscape(lead.socials?.instagram || ''),
                csvEscape(lead.socials?.tiktok || ''),
                csvEscape(lead.socials?.twitter || ''),
                csvEscape(lead.socials?.linkedin || ''),
                csvEscape(lead.source || ''),
            ].join(','));
        });
        downloadCSV(lines.join('\n'), `visio-leads-${new Date().toISOString().split('T')[0]}.csv`);
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
                        {/* View Toggle */}
                        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                            >
                                <LayoutList size={14} />
                            </button>
                        </div>

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
                                onClick={handleDownloadMD}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white font-medium text-sm transition-colors"
                                title="Download Markdown File"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline">MD</span>
                            </button>
                            <button
                                onClick={handleDownloadCSV}
                                className="flex items-center gap-2 px-3 py-2 bg-visio-teal/10 hover:bg-visio-teal/20 border border-visio-teal/20 rounded-xl text-visio-teal font-medium text-sm transition-colors"
                                title="Download CSV File"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline">CSV</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {viewMode === 'table' ? (
                    <div className={`max-w-7xl mx-auto overflow-x-auto rounded-xl border border-white/5 ${isRestricted ? 'blur-sm pointer-events-none select-none' : ''}`}>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-left">
                                    <th className="px-4 py-3 text-white/40 font-medium text-xs">Name</th>
                                    <th className="px-4 py-3 text-white/40 font-medium text-xs">Title</th>
                                    <th className="px-4 py-3 text-white/40 font-medium text-xs">Company</th>
                                    <th className="px-4 py-3 text-white/40 font-medium text-xs">Email</th>
                                    <th className="px-4 py-3 text-white/40 font-medium text-xs">Followers</th>
                                    <th className="px-4 py-3 text-white/40 font-medium text-xs">Country</th>
                                    <th className="px-4 py-3 text-white/40 font-medium text-xs">Source</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-white/40">
                                            {searchQuery ? 'No leads match your search.' : 'No leads yet. Ask V-Prai to find contacts.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLeads.map((lead, i) => (
                                        <tr key={lead.id || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-white font-medium">{lead.name}</td>
                                            <td className="px-4 py-3 text-white/60">{lead.title || '—'}</td>
                                            <td className="px-4 py-3 text-white/60">{lead.company || '—'}</td>
                                            <td className="px-4 py-3">
                                                {lead.email ? (
                                                    <a href={`mailto:${lead.email}`} className="text-visio-teal hover:underline">{lead.email}</a>
                                                ) : <span className="text-white/30">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-white/60">{lead.followers || '—'}</td>
                                            <td className="px-4 py-3 text-white/60">{lead.country || '—'}</td>
                                            <td className="px-4 py-3 text-white/40 text-xs">{lead.source || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        key={searchQuery}
                        className={`max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 relative ${isRestricted ? 'blur-sm pointer-events-none select-none' : ''}`}
                    >
                        {filteredLeads.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <Search size={24} className="text-white/20" />
                                </div>
                                <p className="text-white/40 text-lg">No leads found.</p>
                                <p className="text-white/20 text-sm">
                                    {searchQuery ? 'Try a different search term.' : 'Ask V-Prai to find contacts to populate this list.'}
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
                )}

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
