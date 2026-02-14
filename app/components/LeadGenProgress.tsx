'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, Loader2, Clock, Info } from 'lucide-react';

interface LeadGenProgressProps {
    isActive: boolean;
    progress: {
        tier: string;
        status: string;
        found: number;
        target: number;
        currentSource: string;
        logs: string[];
    } | null;
}

function getLogIcon(line: string) {
    const lower = line.toLowerCase();
    if (lower.includes('found')) {
        return <Check size={14} className="text-visio-accent shrink-0" />;
    }
    if (lower.includes('searching') || lower.includes('running')) {
        return <Loader2 size={14} className="text-visio-teal shrink-0 animate-spin" />;
    }
    if (lower.includes('waiting')) {
        return <Clock size={14} className="text-white/40 shrink-0" />;
    }
    return <Info size={14} className="text-white/30 shrink-0" />;
}

export const LeadGenProgress: React.FC<LeadGenProgressProps> = ({ isActive, progress }) => {
    const percentage = progress && progress.target > 0
        ? Math.min((progress.found / progress.target) * 100, 100)
        : 0;

    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.97 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full"
                >
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/30 overflow-hidden">
                        {/* Background glow */}
                        <div className="absolute -top-20 -right-20 w-60 h-60 bg-visio-teal/5 rounded-full blur-[80px] pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-visio-accent/5 rounded-full blur-[80px] pointer-events-none" />

                        {/* Header */}
                        <div className="relative flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-visio-teal/10 border border-visio-teal/20 flex items-center justify-center">
                                <Search size={18} className="text-visio-teal" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base font-outfit tracking-tight">
                                    Generating Leads
                                </h3>
                                {progress && (
                                    <p className="text-white/40 text-xs font-medium">
                                        {progress.tier} &middot; {progress.status}
                                    </p>
                                )}
                            </div>
                            {progress && (
                                <span className="ml-auto text-sm font-bold text-visio-teal tabular-nums font-outfit">
                                    {progress.found}/{progress.target}
                                </span>
                            )}
                        </div>

                        {/* Progress bar */}
                        <div className="relative w-full h-2.5 bg-white/5 rounded-full overflow-hidden mb-5 border border-white/5">
                            <motion.div
                                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-visio-teal to-visio-accent"
                                initial={{ width: '0%' }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ type: 'spring', damping: 30, stiffness: 100 }}
                            />
                            {/* Shimmer effect */}
                            {percentage > 0 && percentage < 100 && (
                                <motion.div
                                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                    style={{ width: `${percentage}%` }}
                                    animate={{ x: ['-100%', '100%'] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                />
                            )}
                        </div>

                        {/* Log entries */}
                        {progress && progress.logs.length > 0 && (
                            <div className="relative space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {progress.logs.map((line, i) => (
                                    <motion.div
                                        key={`${i}-${line}`}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03, duration: 0.2 }}
                                        className="flex items-start gap-2 py-1 px-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                                    >
                                        <span className="mt-0.5">{getLogIcon(line)}</span>
                                        <span className="text-xs text-white/60 leading-relaxed font-outfit">
                                            {line}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Current source */}
                        {progress?.currentSource && (
                            <div className="relative mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                                <Loader2 size={12} className="text-visio-teal animate-spin" />
                                <span className="text-xs text-white/30 font-outfit">
                                    Searching <span className="text-visio-teal font-medium">{progress.currentSource}</span>
                                </span>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
