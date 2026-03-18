'use client';

import React from 'react';
import { X, Sparkles, ArrowRight, Briefcase, Check } from 'lucide-react';
import { SubscriptionTier } from '@/app/types';

interface UpgradeBannerProps {
    isVisible: boolean;
    onClose: () => void;
    onUpgrade: () => void;
    currentTier: SubscriptionTier;
    creditsBalance: number | null;
}

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({
    isVisible, onClose, onUpgrade, creditsBalance
}) => {
    if (!isVisible) return null;

    const isLowCredits = creditsBalance !== null && creditsBalance <= 5;

    return (
        <div className="fixed bottom-24 right-6 z-50 max-w-sm animate-in slide-in-from-right fade-in duration-500">
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border border-visio-accent/30 rounded-2xl p-6 shadow-2xl shadow-visio-accent/10">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1 text-white/30 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-visio-accent/10 shrink-0">
                            <Sparkles size={20} className="text-visio-accent" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">
                                {isLowCredits ? 'Credits running low' : 'Ready to grow your reach?'}
                            </p>
                            <p className="text-xs text-white/50 mt-1 leading-relaxed">
                                Unlock powerful AI search, CSV exports, and priority support.
                            </p>
                        </div>
                    </div>

                    {/* Recommended plans */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                            <div className="flex items-center gap-2">
                                <Briefcase size={14} className="text-cyan-400" />
                                <div>
                                    <p className="text-xs font-bold text-white">Starter Label</p>
                                    <p className="text-[10px] text-white/40">3 profiles &middot; 250 credits &middot; CSV export</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-cyan-400">R950</p>
                                <span className="text-[9px] text-cyan-400/60 font-medium uppercase tracking-wider">Recommended</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                            <div className="flex items-center gap-2">
                                <Briefcase size={14} className="text-blue-400" />
                                <div>
                                    <p className="text-xs font-bold text-white">Label Pro</p>
                                    <p className="text-[10px] text-white/40">5 profiles &middot; 500 credits &middot; 100 searches/day</p>
                                </div>
                            </div>
                            <p className="text-sm font-bold text-blue-400">R1,799</p>
                        </div>
                    </div>

                    <button
                        onClick={onUpgrade}
                        className="w-full py-2.5 bg-white text-black rounded-xl text-sm font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                        Choose a Plan
                        <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
