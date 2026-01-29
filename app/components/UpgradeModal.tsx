'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature: string;
    requiredTier: SubscriptionTier;
    onUpgrade: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    feature,
    requiredTier,
    onUpgrade
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-visio-accent/5 overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-visio-accent/5 rounded-full blur-[80px] pointer-events-none" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/30 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                            <Lock size={32} className="text-visio-accent" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Unlock {feature}</h2>
                            <p className="text-white/50">
                                This feature is available on the <span className="text-white font-bold capitalize">{requiredTier}</span> plan and above.
                            </p>
                        </div>

                        <div className="w-full bg-white/5 rounded-xl p-4 border border-white/5">
                            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-3 text-left">Plan Benefits</h3>
                            <div className="space-y-2">
                                <BenefitItem text="Increased limits" />
                                <BenefitItem text="Advanced AI models" />
                                <BenefitItem text="Priority support" />
                            </div>
                        </div>

                        <button
                            onClick={onUpgrade}
                            className="w-full py-4 bg-white text-black rounded-xl font-bold hover:scale-105 transition-transform"
                        >
                            Upgrade to {requiredTier}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const BenefitItem = ({ text }: { text: string }) => (
    <div className="flex items-center gap-3 text-sm text-white/60">
        <div className="w-5 h-5 rounded-full bg-visio-accent/10 flex items-center justify-center shrink-0">
            <Check size={10} className="text-visio-accent" />
        </div>
        <span>{text}</span>
    </div>
);
