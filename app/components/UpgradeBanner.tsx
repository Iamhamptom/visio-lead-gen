'use client';

import React from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
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
        <div className="fixed bottom-24 right-6 z-40 max-w-xs animate-in slide-in-from-right fade-in duration-500">
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border border-visio-accent/30 rounded-2xl p-5 shadow-2xl shadow-visio-accent/10">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1 text-white/30 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-visio-accent/10 shrink-0">
                        <Sparkles size={18} className="text-visio-accent" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-white">
                            {isLowCredits ? 'Running low on credits' : 'Unlock more features'}
                        </p>
                        <p className="text-xs text-white/50 leading-relaxed">
                            {isLowCredits
                                ? 'Upgrade your plan for more credits and advanced AI capabilities.'
                                : 'Get deeper searches, more credits, and priority AI with an upgrade.'}
                        </p>
                        <button
                            onClick={onUpgrade}
                            className="flex items-center gap-1.5 text-xs font-medium text-visio-accent hover:text-white transition-colors group"
                        >
                            View Plans
                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
