import React from 'react';
import { Search, FileText, Mail, Megaphone, Sparkles, Compass } from 'lucide-react';
import { ToolId } from '@/app/types';

const TOOL_DEFS: {
    id: ToolId;
    label: string;
    description: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
    { id: 'web_search', label: 'Web Search', description: 'Use Google sources', icon: Search },
    { id: 'summarize_chat', label: 'Summarize Chat', description: 'Key points + next steps', icon: FileText },
    { id: 'draft_pitch', label: 'Draft Pitch', description: 'PR pitch email', icon: Mail },
    { id: 'press_release', label: 'Press Release', description: 'Short release draft', icon: Megaphone },
    { id: 'social_pack', label: 'Social Pack', description: 'Post ideas + captions', icon: Sparkles },
    { id: 'market_research', label: 'Market Research', description: 'Quick market snapshot', icon: Compass }
];

interface ToolsPanelProps {
    activeTool: ToolId;
    onSelect: (tool: ToolId) => void;
    webSearchEnabled: boolean;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({ activeTool, onSelect, webSearchEnabled }) => {
    return (
        <div className="pointer-events-auto w-44 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-3 shadow-xl">
            <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Tools</div>
            <div className="space-y-2">
                {TOOL_DEFS.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;
                    const isSearch = tool.id === 'web_search';
                    const isDisabled = isSearch && !webSearchEnabled;
                    return (
                        <button
                            key={tool.id}
                            type="button"
                            onClick={() => {
                                if (isDisabled) return;
                                onSelect(tool.id);
                            }}
                            className={`w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-all border ${isActive ? 'border-visio-teal/40 bg-visio-teal/10 text-visio-teal' : 'border-white/5 bg-white/[0.02] text-white/70 hover:text-white'} ${isDisabled ? 'opacity-50' : ''}`}
                        >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isActive ? 'bg-visio-teal/20' : 'bg-white/5'}`}>
                                <Icon size={14} />
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-semibold">{tool.label}</div>
                                <div className="text-[10px] text-white/40">{tool.description}</div>
                            </div>
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={() => onSelect('none')}
                    className={`w-full rounded-xl px-2.5 py-2 text-xs font-medium border transition-all ${activeTool === 'none' ? 'border-white/20 text-white' : 'border-white/5 text-white/50 hover:text-white/70'}`}
                >
                    Clear Tool
                </button>
            </div>
        </div>
    );
};
