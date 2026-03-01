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
        <div className="flex flex-col h-full w-full relative">
            {/* Header Area */}
            <div className="sticky top-0 z-20 bg-black/60 backdrop-blur-xl border-b border-white/10 px-6 py-5">
                <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Title Section */}
                    <div>
                        <h2 className="text-3xl font-semibold text-white tracking-tight mb-1 flex items-center gap-3">
                            My Leads
                            <span className="px-2.5 py-0.5 rounded-full bg-visio-teal/10 text-visio-teal text-xs font-medium border border-visio-teal/20">
                                {filteredLeads.length} {filteredLeads.length === 1 ? 'Contact' : 'Contacts'}
                            </span>
                        </h2>
                        <p className="text-sm text-white/50 font-medium">
                            {searchQuery ? 'Filtered results from your campaigns.' : 'All contacts gathered across campaigns.'}
                        </p>
                    </div>

                    {/* Controls Section */}
                    <div className="flex flex-wrap items-center gap-3">
                        
                        {/* Search */}
                        <div className="relative group flex-grow lg:flex-grow-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-visio-teal transition-colors" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search leads..."
                                className="w-full lg:w-64 bg-white/[0.03] border border-white/10 hover:border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-visio-teal/50 focus:bg-white/[0.05] transition-all"
                            />
                        </div>

                        {/* View Toggles */}
                        <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                                title="Grid View"
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                                title="Table View"
                            >
                                <LayoutList size={16} />
                            </button>
                        </div>

                        <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block"></div>

                        {/* Exports */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopy}
                                className="flex items-center justify-center gap-2 w-10 h-10 lg:w-auto lg:px-4 lg:py-2 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all text-sm font-medium"
                                title="Copy Markdown to Clipboard"
                            >
                                {copied ? <Check size={16} className="text-visio-teal" /> : <Copy size={16} />}
                                <span className="hidden lg:inline">{copied ? 'Copied' : 'Copy MD'}</span>
                            </button>
                            <button
                                onClick={handleDownloadMD}
                                className="flex items-center justify-center gap-2 w-10 h-10 lg:w-auto lg:px-4 lg:py-2 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all text-sm font-medium"
                                title="Download Markdown File"
                            >
                                <Download size={16} />
                                <span className="hidden lg:inline">MD</span>
                            </button>
                            <button
                                onClick={handleDownloadCSV}
                                className="flex items-center justify-center gap-2 w-10 h-10 lg:w-auto lg:px-4 lg:py-2 rounded-xl bg-visio-teal/10 hover:bg-visio-teal/20 border border-visio-teal/30 text-visio-teal hover:text-visio-teal transition-all text-sm font-medium shadow-[0_0_15px_rgba(var(--visio-teal-rgb),0.1)]"
                                title="Download CSV File"
                            >
                                <Download size={16} />
                                <span className="hidden lg:inline">CSV</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 relative">
                {viewMode === 'table' ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.3 }}
                        className={`max-w-7xl mx-auto ${isRestricted ? 'blur-md pointer-events-none select-none' : ''}`}
                    >
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white/[0.03] border-b border-white/10">
                                        <tr>
                                            <th className="px-6 py-4 text-white/50 font-semibold text-xs uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-4 text-white/50 font-semibold text-xs uppercase tracking-wider">Title</th>
                                            <th className="px-6 py-4 text-white/50 font-semibold text-xs uppercase tracking-wider">Company</th>
                                            <th className="px-6 py-4 text-white/50 font-semibold text-xs uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-4 text-white/50 font-semibold text-xs uppercase tracking-wider">Followers</th>
                                            <th className="px-6 py-4 text-white/50 font-semibold text-xs uppercase tracking-wider">Country</th>
                                            <th className="px-6 py-4 text-white/50 font-semibold text-xs uppercase tracking-wider text-right">Source</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredLeads.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-20 text-center">
                                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
                                                        <Search size={20} className="text-white/30" />
                                                    </div>
                                                    <p className="text-white/60 font-medium">{searchQuery ? 'No leads match your search.' : 'No leads yet. Ask V-Prai to find contacts.'}</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredLeads.map((lead, i) => (
                                                <tr key={lead.id || i} className="hover:bg-white/[0.04] transition-colors group">
                                                    <td className="px-6 py-4 text-white font-medium">{lead.name}</td>
                                                    <td className="px-6 py-4 text-white/70">{lead.title || <span className="text-white/20">—</span>}</td>
                                                    <td className="px-6 py-4 text-white/70">{lead.company || <span className="text-white/20">—</span>}</td>
                                                    <td className="px-6 py-4">
                                                        {lead.email ? (
                                                            <a href={`mailto:${lead.email}`} className="text-visio-teal hover:text-visio-teal/80 hover:underline transition-colors">{lead.email}</a>
                                                        ) : <span className="text-white/20">—</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-white/70">{lead.followers || <span className="text-white/20">—</span>}</td>
                                                    <td className="px-6 py-4 text-white/70">{lead.country || <span className="text-white/20">—</span>}</td>
                                                    <td className="px-6 py-4 text-white/40 text-xs text-right">
                                                        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                                                            {lead.source || 'Unknown'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        key={searchQuery}
                        className={`max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 relative ${isRestricted ? 'blur-md pointer-events-none select-none' : ''}`}
                    >
                        {filteredLeads.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-32 text-center">
                                <div className="w-20 h-20 rounded-2xl bg-white/[0.02] border border-white/10 shadow-inner flex items-center justify-center mb-6">
                                    <Search size={32} className="text-white/20" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">No leads found</h3>
                                <p className="text-white/40 max-w-sm">
                                    {searchQuery ? 'Try adjusting your search filters to find what you are looking for.' : 'Ask V-Prai to find contacts to populate this list and start building your pipeline.'}
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

                {/* Restricted State Overlay */}
                <AnimatePresence>
                    {isRestricted && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
                        >
                            <div className="bg-[#0f0f0f] border border-white/10 p-10 rounded-3xl text-center max-w-lg mx-auto shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-visio-teal to-transparent opacity-50"></div>
                                <div className="w-20 h-20 rounded-full bg-visio-teal/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-visio-teal/20 shadow-[0_0_30px_rgba(var(--visio-teal-rgb),0.15)]">
                                    <Search className="text-visio-teal w-10 h-10" />
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-3">Results Hidden</h3>
                                <p className="text-white/50 mb-8 leading-relaxed text-sm">
                                    Your account is currently in Preview Mode. Please wait for admin approval to view full lead generation results and export capabilities.
                                </p>
                                <button className="px-8 py-3 bg-white hover:bg-white/90 text-black font-semibold rounded-xl transition-all pointer-events-auto shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98]">
                                    Refresh Status
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
