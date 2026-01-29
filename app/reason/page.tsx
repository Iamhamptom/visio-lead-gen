'use client';

import React, { useState } from 'react';
import { TargetPicker } from '../components/TargetPicker';
import { PitchScoreCard } from '../components/PitchScoreCard';
import { PitchBrief } from '../types';
import { generatePitchBrief } from './actions';
import { VisioOrb } from '../components/VisioOrb';
import { ArrowLeft, Sparkles, Copy, Mail, MessageCircle, FileText } from 'lucide-react';

interface ReasonPageProps {
    onBack?: () => void;
}

export default function ReasonPage({ onBack }: ReasonPageProps) {
    const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
    const [goal, setGoal] = useState('Premiere');
    const [isGenerating, setIsGenerating] = useState(false);
    const [brief, setBrief] = useState<PitchBrief | null>(null);
    const [activeCopyTab, setActiveCopyTab] = useState<'email' | 'dm'>('email');

    const handleGenerate = async () => {
        if (!selectedTargetId) return;
        setIsGenerating(true);
        // Mock campaign ID for now
        const result = await generatePitchBrief(selectedTargetId, 'campaign_1', goal);
        setBrief(result);
        setIsGenerating(false);
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-visio-bg text-white overflow-hidden font-outfit">

            {/* LEFT PANEL: INPUTS */}
            <div className={`w-full md:w-[400px] border-r border-white/5 p-6 flex flex-col gap-6 overflow-y-auto ${brief ? 'hidden md:flex' : 'flex'}`}>
                <div>
                    <button
                        onClick={onBack}
                        className="mb-4 text-xs font-medium text-white/40 hover:text-white flex items-center gap-1 transition-colors"
                    >
                        <ArrowLeft size={14} />
                        Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold mb-1">Pitch Strategist</h1>
                    <p className="text-white/40 text-sm">Select a target to generate a tailored pitch strategy.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Placement Goal</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['Premiere', 'Feature', 'Review'].map(g => (
                            <button
                                key={g}
                                onClick={() => setGoal(g)}
                                className={`py-2 px-3 rounded-lg text-sm transition-colors border ${goal === g ? 'bg-visio-accent/10 border-visio-accent text-visio-accent' : 'bg-white/5 border-transparent text-white/60 hover:text-white'}`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2 flex-1">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Select Target</label>
                    <TargetPicker selectedTargetId={selectedTargetId} onSelect={setSelectedTargetId} />
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={!selectedTargetId || isGenerating}
                    className="w-full py-4 bg-visio-accent text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(182,240,156,0.2)]"
                >
                    {isGenerating ? (
                        <>
                            <VisioOrb active={true} size="sm" />
                            <span>Analyzing...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} />
                            <span>Generate Brief</span>
                        </>
                    )}
                </button>
            </div>

            {/* RIGHT PANEL: OUTPUT */}
            <div className="flex-1 bg-black/20 overflow-y-auto">
                {!brief ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4 p-8">
                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
                            <Sparkles size={40} className="opacity-50" />
                        </div>
                        <p className="text-center max-w-sm">Select a target on the left to analyze compatibility, opportunities, and draft personalized outreach.</p>
                    </div>
                ) : (
                    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4 fade-in duration-500">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Strategy Brief</h2>
                                <p className="text-white/40 flex items-center gap-2 text-sm">
                                    Generated for <span className="text-white font-medium">Campaign #1</span> • {new Date(brief.generatedAt).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={() => alert('Saved to briefcase!')}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-colors flex items-center gap-2"
                            >
                                <FileText size={16} />
                                Save Brief
                            </button>
                        </div>

                        {/* Score Card */}
                        <PitchScoreCard score={brief.score} breakdown={brief.scoreBreakdown} />

                        {/* Two Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Left Col: Analysis */}
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <span className="w-1 h-6 bg-visio-teal rounded-full" />
                                        Why This Works
                                    </h3>
                                    <div className="space-y-3">
                                        {brief.reasons.map((reason, i) => (
                                            <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-semibold text-visio-sage">{reason.title}</span>
                                                    <span className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded text-white/50">{reason.type}</span>
                                                </div>
                                                <p className="text-sm text-white/70 leading-relaxed">{reason.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <span className="w-1 h-6 bg-purple-500 rounded-full" />
                                        Value Exchange
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 p-4 rounded-xl">
                                            <h4 className="text-xs uppercase text-white/40 font-bold mb-3">For Them</h4>
                                            <ul className="space-y-2">
                                                {brief.valueProps.forThem.map((vp, i) => (
                                                    <li key={i} className="text-xs text-white/80 flex items-start gap-2">
                                                        <span className="text-visio-accent">•</span> {vp}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl">
                                            <h4 className="text-xs uppercase text-white/40 font-bold mb-3">For Us</h4>
                                            <ul className="space-y-2">
                                                {brief.valueProps.forUs.map((vp, i) => (
                                                    <li key={i} className="text-xs text-white/80 flex items-start gap-2">
                                                        <span className="text-purple-400">•</span> {vp}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Col: Outreach Copy */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-fit sticky top-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold">Recommended Outreach</h3>
                                    <div className="flex bg-black/40 rounded-lg p-1">
                                        <button
                                            onClick={() => setActiveCopyTab('email')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeCopyTab === 'email' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                                        >
                                            Email
                                        </button>
                                        <button
                                            onClick={() => setActiveCopyTab('dm')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeCopyTab === 'dm' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                                        >
                                            Direct Message
                                        </button>
                                    </div>
                                </div>

                                {activeCopyTab === 'email' ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-white/30 uppercase font-bold mb-1 block">Subject Line</label>
                                            <div className="bg-black/20 p-3 rounded-lg text-sm text-white/90 border border-white/5 flex justify-between gap-2 group">
                                                <span className="truncate">{brief.copy.emailSubject}</span>
                                                <Copy size={14} className="text-white/20 group-hover:text-white cursor-pointer" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-white/30 uppercase font-bold mb-1 block">Body</label>
                                            <div className="bg-black/20 p-4 rounded-lg text-sm text-white/80 border border-white/5 whitespace-pre-wrap leading-relaxed min-h-[200px] relative group">
                                                {brief.copy.emailBody}
                                                <button className="absolute top-3 right-3 p-2 bg-white/10 rounded hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-white/30 uppercase font-bold mb-1 block">Message</label>
                                            <div className="bg-black/20 p-4 rounded-lg text-sm text-white/80 border border-white/5 whitespace-pre-wrap leading-relaxed min-h-[150px] relative group">
                                                {brief.copy.dmShort}
                                                <button className="absolute top-3 right-3 p-2 bg-white/10 rounded hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 flex justify-end">
                                    <button className="px-4 py-2 bg-visio-teal/10 hover:bg-visio-teal/20 text-visio-teal border border-visio-teal/20 rounded-lg text-sm font-medium transition-all flex items-center gap-2">
                                        <Mail size={16} />
                                        Open in Mail Client
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
