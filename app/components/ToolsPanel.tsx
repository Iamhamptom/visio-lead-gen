import React from 'react';
import { Search, FileText, Mail, Megaphone, Sparkles, Calendar, Target, ClipboardList } from 'lucide-react';
import { ToolId } from '@/app/types';

const TOOL_DEFS: {
    id: ToolId;
    label: string;
    description: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
    { id: 'generate_leads', label: 'Generate Leads', description: 'Smart lead finder', icon: Target },
    { id: 'draft_pitch', label: 'Draft Pitch', description: 'PR pitch email', icon: Mail },
    { id: 'press_release', label: 'Press Release', description: 'AP-style release', icon: Megaphone },
    { id: 'social_pack', label: 'Social Pack', description: 'Content + captions', icon: Sparkles },
    { id: 'campaign_plan', label: 'Campaign Plan', description: 'Full strategy timeline', icon: Calendar },
    { id: 'web_search', label: 'Web Search', description: 'Current info from web', icon: Search },
    { id: 'summarize_chat', label: 'Summarize', description: 'Key decisions + next steps', icon: ClipboardList },
];

interface ToolsPanelProps {
    activeTool: ToolId;
    onSelect: (tool: ToolId) => void;
    webSearchEnabled: boolean;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({ activeTool, onSelect, webSearchEnabled }) => {
    return (
        <div className="pointer-events-auto w-56 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl p-4 shadow-2xl ring-1 ring-white/5">
            <div className="flex items-center gap-2 mb-3 px-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Toolbox</div>
            </div>
            <div className="space-y-1.5">
                {TOOL_DEFS.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;
                    const isSearch = tool.id === 'web_search';
                    const isDisabled = isSearch && !webSearchEnabled;
                    const isLeadGen = tool.id === 'generate_leads';
                    
                    return (
                        <button
                            key={tool.id}
                            type="button"
                            onClick={() => {
                                if (isDisabled) return;
                                onSelect(tool.id);
                            }}
                            className={`group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-300 ease-out border ${
                                isActive
                                    ? isLeadGen
                                        ? 'border-visio-accent/30 bg-visio-accent/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                                        : 'border-visio-teal/30 bg-visio-teal/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                                    : 'border-transparent hover:border-white/10 hover:bg-white/[0.04]'
                            } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            {isActive && (
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-full ${isLeadGen ? 'bg-visio-accent' : 'bg-visio-teal'}`} />
                            )}
                            
                            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                isActive
                                    ? isLeadGen 
                                        ? 'bg-visio-accent/20 text-visio-accent ring-1 ring-visio-accent/40' 
                                        : 'bg-visio-teal/20 text-visio-teal ring-1 ring-visio-teal/40'
                                    : 'bg-white/5 text-white/50 group-hover:bg-white/10 group-hover:text-white/90 group-hover:scale-105 group-hover:shadow-md'
                            }`}>
                                <Icon size={14} className={isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className={`text-[13px] font-medium truncate transition-colors duration-300 ${
                                    isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
                                }`}>
                                    {tool.label}
                                </div>
                                <div className={`text-[11px] truncate transition-colors duration-300 mt-0.5 ${
                                    isActive ? 'text-white/70' : 'text-white/40 group-hover:text-white/60'
                                }`}>
                                    {tool.description}
                                </div>
                            </div>
                        </button>
                    );
                })}
                
                <div className="pt-2 mt-2 border-t border-white/5">
                    <button
                        type="button"
                        onClick={() => onSelect('none')}
                        className={`w-full rounded-xl px-3 py-2.5 text-xs font-medium border transition-all duration-300 flex items-center justify-center gap-2 ${
                            activeTool === 'none' 
                                ? 'border-white/20 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
                                : 'border-transparent text-white/40 hover:bg-white/5 hover:text-white/80'
                        }`}
                    >
                        Clear Selection
                    </button>
                </div>
            </div>
        </div>
    );
};
