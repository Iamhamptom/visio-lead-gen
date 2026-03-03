'use client';

import React, { useState } from 'react';
import { ArrowRight, Globe, Sparkles, LayoutGrid, Coins } from 'lucide-react';
import {
    GLOBAL_TEMPLATES,
    GlobalTemplate,
} from './CampaignTemplates';
import {
    GlobalGeographySelector,
    GeographySelection,
    formatGeographyForPrompt,
    DEFAULT_GEOGRAPHY,
} from './GlobalGeographySelector';

// Show the top 4 most versatile templates as quick suggestions
const SUGGESTED_IDS = ['pitch-djs', 'pitch-radio', 'pitch-playlist-curators', 'press-journalists'];
const SUGGESTED_TEMPLATES = GLOBAL_TEMPLATES.filter(t => SUGGESTED_IDS.includes(t.id));

interface TemplateSuggestionsProps {
    onUseTemplate: (prompt: string) => void;
    onViewAll: () => void;
}

export const TemplateSuggestions: React.FC<TemplateSuggestionsProps> = ({ onUseTemplate, onViewAll }) => {
    const [geoState, setGeoState] = useState<Record<string, GeographySelection>>({});

    const getGeo = (id: string) => geoState[id] || DEFAULT_GEOGRAPHY;

    const handleLaunch = (template: GlobalTemplate) => {
        const geo = getGeo(template.id);
        const geoString = formatGeographyForPrompt(geo);
        const prompt = template.buildPrompt(geoString, 50); // default 50 leads
        onUseTemplate(prompt);
    };

    return (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* V-Prai Logo */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-visio-teal/20 to-visio-sage/20 border border-visio-teal/30 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(182,240,156,0.1)]">
                <span className="text-2xl font-bold bg-gradient-to-br from-visio-teal to-visio-sage bg-clip-text text-transparent">V</span>
            </div>

            <div className="space-y-2 max-w-md px-4">
                <h3 className="text-2xl font-semibold text-white">How can I help today?</h3>
                <p className="text-white/40 text-sm">Launch a global campaign blueprint or ask me anything about lead generation, pitches, and strategy.</p>
            </div>

            {/* Template Suggestion Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                {SUGGESTED_TEMPLATES.map((template) => {
                    const geo = getGeo(template.id);
                    const Icon = template.icon;

                    return (
                        <div
                            key={template.id}
                            className="group relative flex flex-col p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.14] transition-all duration-200"
                        >
                            {/* Top: Icon + Title */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-xl ${template.bg} border ${template.border}`}>
                                    <Icon size={16} className={template.color} strokeWidth={1.5} />
                                </div>
                                <div className="text-left flex-1">
                                    <h4 className="text-sm font-medium text-white/90">{template.title}</h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Globe size={10} className="text-visio-teal/60" />
                                        <span className="text-[10px] text-white/30">Worldwide</span>
                                    </div>
                                </div>
                            </div>

                            {/* Geography + Launch */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
                                <GlobalGeographySelector
                                    value={geo}
                                    onChange={(newGeo) => setGeoState(prev => ({ ...prev, [template.id]: newGeo }))}
                                    compact
                                />
                                <button
                                    onClick={() => handleLaunch(template)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.06] hover:border-white/[0.15] text-xs font-medium text-white/60 hover:text-white transition-all group/btn"
                                >
                                    <span>Launch</span>
                                    <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* View All Templates */}
            <button
                onClick={onViewAll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] text-xs font-medium text-white/50 hover:text-white/80 transition-all"
            >
                <LayoutGrid size={14} />
                <span>View all 15 campaign blueprints</span>
            </button>
        </div>
    );
};
