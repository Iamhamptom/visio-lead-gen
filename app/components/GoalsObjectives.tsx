import React, { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Target, Users, MapPin, Calendar, DollarSign, Clock, Music, Mic2, Handshake, Newspaper, Sparkles, Search, Loader2, Plus, X, GripVertical, Save } from 'lucide-react';
import { ArtistGoals, ArtistProfile } from '../types';
import { ShinyButton } from './ui/ShinyButton';

interface GoalsObjectivesProps {
    profile: ArtistProfile;
    onUpdate: (goals: ArtistGoals) => void;
}

const GOAL_OPTIONS = [
    { value: 'grow_streams', label: 'Grow Streams', icon: <Music size={24} />, color: 'from-green-400 to-emerald-600' },
    { value: 'get_signed', label: 'Get Signed', icon: <Sparkles size={24} />, color: 'from-purple-400 to-violet-600' },
    { value: 'book_shows', label: 'Book Shows', icon: <Mic2 size={24} />, color: 'from-orange-400 to-red-500' },
    { value: 'brand_deals', label: 'Brand Deals', icon: <Handshake size={24} />, color: 'from-blue-400 to-cyan-500' },
    { value: 'press_coverage', label: 'Press Coverage', icon: <Newspaper size={24} />, color: 'from-pink-400 to-rose-500' },
] as const;

const REGIONS = ['USA', 'UK', 'Germany', 'France', 'South Africa', 'Australia', 'Canada', 'Japan', 'Brazil', 'Netherlands'];

const DEFAULT_GOALS: ArtistGoals = {
    primaryGoal: 'grow_streams',
    keyObjectives: ['Reach 10k monthly listeners', 'Release 3 singles'],
    targetAudiences: ['Indie Pop', 'Bedroom Pop'],
    targetRegions: [],
    budgetRange: 'medium',
    timeline: '6_months',
};

export const GoalsObjectives: React.FC<GoalsObjectivesProps> = ({ profile, onUpdate }) => {
    // Migration: Handle old data format if targetAudience was a string
    const initialGoals = {
        ...DEFAULT_GOALS,
        ...profile.goals,
        targetAudiences: profile.goals?.targetAudiences || (profile.goals as any)?.targetAudience ? [(profile.goals as any).targetAudience] : DEFAULT_GOALS.targetAudiences,
        keyObjectives: profile.goals?.keyObjectives || DEFAULT_GOALS.keyObjectives
    };

    const [goals, setGoals] = useState<ArtistGoals>(initialGoals);
    const [isResearching, setIsResearching] = useState(false);
    const [researchResults, setResearchResults] = useState<string | null>(null);
    const [newObjective, setNewObjective] = useState('');
    const [newAudience, setNewAudience] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const updateGoal = <K extends keyof ArtistGoals>(key: K, value: ArtistGoals[K]) => {
        const updated = { ...goals, [key]: value };
        setGoals(updated);
        // We don't auto-save on every keystroke anymore, user must click Save
    };

    const handleSave = () => {
        setIsSaving(true);
        // Simulate API call
        setTimeout(() => {
            onUpdate(goals);
            setIsSaving(false);
        }, 800);
    };

    // --- Objectives Handlers ---
    const addObjective = () => {
        if (!newObjective.trim()) return;
        const updated = [...(goals.keyObjectives || []), newObjective.trim()];
        updateGoal('keyObjectives', updated);
        setNewObjective('');
    };

    const removeObjective = (index: number) => {
        const updated = goals.keyObjectives.filter((_, i) => i !== index);
        updateGoal('keyObjectives', updated);
    };

    const handleReorderObjectives = (newOrder: string[]) => {
        updateGoal('keyObjectives', newOrder);
    };


    // --- Audience Handlers ---
    const addAudience = (e?: React.KeyboardEvent) => {
        if (e && e.key !== 'Enter') return;
        if (!newAudience.trim()) return;
        if (goals.targetAudiences.includes(newAudience.trim())) return;

        const updated = [...(goals.targetAudiences || []), newAudience.trim()];
        updateGoal('targetAudiences', updated);
        setNewAudience('');
    };

    const removeAudience = (tag: string) => {
        const updated = goals.targetAudiences.filter(t => t !== tag);
        updateGoal('targetAudiences', updated);
    };

    const toggleRegion = (region: string) => {
        const current = goals.targetRegions || [];
        const updated = current.includes(region)
            ? current.filter(r => r !== region)
            : [...current, region];
        updateGoal('targetRegions', updated);
    };

    const handleDeepResearch = async () => {
        setIsResearching(true);
        setResearchResults(null);

        try {
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            setResearchResults(`**Research Summary for ${profile.name}**\n\n• Strong presence in indie/alternative scenes.\n• Potential viral overlap with "Sad Girl Starter Pack" aesthetic on TikTok.\n• Competitors: Clairo, Beabadoobee.\n\n**Recommended Goal**: Focus on "Grow Streams" via playlisting campaigns targeting "Late Night Vibes" playlists.`);
        } catch (error) {
            setResearchResults('Research failed. Please try again.');
        } finally {
            setIsResearching(false);
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500 pb-20">

            {/* Save Header */}
            <div className="flex items-center justify-between sticky top-0 z-10 bg-visio-bg/95 backdrop-blur-sm py-4 border-b border-white/5 -mx-4 px-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Strategy & Goals</h2>
                    <p className="text-sm text-white/40">Define your roadmap for the next campaign.</p>
                </div>
                <ShinyButton
                    text={isSaving ? "Saving..." : "Save Changes"}
                    icon={isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    onClick={handleSave}
                    className="bg-visio-teal text-black font-bold"
                />
            </div>

            {/* Deep Research Section */}
            <div className="bg-gradient-to-br from-visio-teal/10 to-blue-500/10 border border-visio-teal/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Search size={18} className="text-visio-teal" />
                            Deep Research on Self
                        </h3>
                        <p className="text-sm text-white/50 mt-1">AI Agent analyzes your current web footprint to suggest goals.</p>
                    </div>
                    <button
                        onClick={handleDeepResearch}
                        disabled={isResearching}
                        className="px-4 py-2 bg-visio-teal/20 text-visio-teal border border-visio-teal/30 rounded-lg text-sm font-medium hover:bg-visio-teal/30 transition-colors flex items-center gap-2"
                    >
                        {isResearching ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                        {isResearching ? "Analyzing..." : "Run Analysis"}
                    </button>
                </div>

                {researchResults && !isResearching && (
                    <div className="mt-4 p-4 bg-black/40 rounded-xl border border-visio-teal/10">
                        <div className="prose prose-invert prose-sm max-w-none text-white/80 whitespace-pre-wrap leading-relaxed">
                            {researchResults}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT COL */}
                <div className="space-y-8">
                    {/* Primary Goal Selection */}
                    <div>
                        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Target size={14} />
                            Primary Goal
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {GOAL_OPTIONS.map((option) => (
                                <motion.button
                                    key={option.value}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => updateGoal('primaryGoal', option.value)}
                                    className={`relative p-4 rounded-xl border transition-all text-left flex items-center gap-3 ${goals.primaryGoal === option.value
                                        ? 'bg-white/10 border-visio-accent shadow-[0_0_15px_rgba(182,240,156,0.1)]'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${goals.primaryGoal === option.value
                                        ? `bg-gradient-to-br ${option.color} text-white`
                                        : 'bg-white/10 text-white/50'
                                        }`}>
                                        {React.cloneElement(option.icon as React.ReactElement, { size: 20 })}
                                    </div>
                                    <span className={`text-sm font-medium ${goals.primaryGoal === option.value ? 'text-white' : 'text-white/60'}`}>
                                        {option.label}
                                    </span>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Key Objectives (Ordered List) */}
                    <div>
                        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Check size={14} />
                            Key Objectives (Ordered)
                        </h3>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                            <div className="flex gap-2">
                                <input
                                    value={newObjective}
                                    onChange={(e) => setNewObjective(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addObjective()}
                                    placeholder="Add specific objective (e.g. Reach 5k followers)..."
                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-visio-accent focus:outline-none"
                                />
                                <button
                                    onClick={addObjective}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transaction-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>

                            <Reorder.Group axis="y" values={goals.keyObjectives || []} onReorder={handleReorderObjectives} className="space-y-2">
                                {(goals.keyObjectives || []).map((obj, i) => (
                                    <Reorder.Item key={obj} value={obj}>
                                        <div className="flex items-center gap-3 bg-black/40 border border-white/5 p-3 rounded-lg group cursor-grab active:cursor-grabbing">
                                            <GripVertical size={14} className="text-white/20 group-hover:text-white/40" />
                                            <span className="text-white/40 font-mono text-xs w-4">0{i + 1}</span>
                                            <span className="flex-1 text-sm text-white/80">{obj}</span>
                                            <button
                                                onClick={() => removeObjective(i)}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-white/20 transition-all"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                            {(goals.keyObjectives?.length === 0) && (
                                <p className="text-xs text-white/30 text-center py-2 italic">No objectives added yet.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COL */}
                <div className="space-y-8">
                    {/* Target Audience (Tags) */}
                    <div>
                        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Users size={14} />
                            Target Audiences / Niches
                        </h3>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex flex-wrap gap-2 mb-3">
                                {goals.targetAudiences?.map((tag) => (
                                    <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-visio-teal/10 border border-visio-teal/20 text-visio-teal text-sm rounded-full">
                                        {tag}
                                        <button onClick={() => removeAudience(tag)} className="hover:text-white">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={newAudience}
                                    onChange={(e) => setNewAudience(e.target.value)}
                                    onKeyDown={addAudience}
                                    placeholder="+ Add niche (Press Enter)"
                                    className="bg-transparent border-none text-sm text-white placeholder:text-white/30 focus:ring-0 w-40 min-w-[150px]"
                                />
                            </div>
                            <p className="text-xs text-white/30">Target specific subcultures (e.g., "Skater Punk", "Study Beats", "Crossfit").</p>
                        </div>
                    </div>

                    {/* Target Regions */}
                    <div>
                        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <MapPin size={14} />
                            Key Territories
                        </h3>
                        <div className="flex flex-wrap gap-2 bg-white/5 border border-white/10 rounded-xl p-4">
                            {REGIONS.map((region) => (
                                <button
                                    key={region}
                                    onClick={() => toggleRegion(region)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${goals.targetRegions.includes(region)
                                        ? 'bg-white text-black font-bold'
                                        : 'bg-black/20 text-white/40 hover:bg-black/40 hover:text-white'
                                        }`}
                                >
                                    {region}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Budget & Timeline */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <DollarSign size={14} />
                                Budget
                            </h3>
                            <div className="flex flex-col gap-2">
                                {(['low', 'medium', 'high'] as const).map((budget) => (
                                    <button
                                        key={budget}
                                        onClick={() => updateGoal('budgetRange', budget)}
                                        className={`w-full py-2 rounded-lg text-sm font-medium capitalize transition-all border ${goals.budgetRange === budget
                                            ? 'bg-visio-accent/10 border-visio-accent text-visio-accent'
                                            : 'bg-white/5 border-transparent text-white/40 hover:text-white'
                                            }`}
                                    >
                                        {budget}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock size={14} />
                                Timeline
                            </h3>
                            <div className="flex flex-col gap-2">
                                {([
                                    { value: '3_months', label: '3 Months' },
                                    { value: '6_months', label: '6 Months' },
                                    { value: '1_year', label: '1 Year' },
                                ] as const).map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => updateGoal('timeline', option.value)}
                                        className={`w-full py-2 rounded-lg text-sm font-medium transition-all border ${goals.timeline === option.value
                                            ? 'bg-visio-accent/10 border-visio-accent text-visio-accent'
                                            : 'bg-white/5 border-transparent text-white/40 hover:text-white'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
