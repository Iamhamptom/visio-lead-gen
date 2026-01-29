import React from 'react';
import { motion } from 'framer-motion';

interface PitchScoreCardProps {
    score: number;
    breakdown: {
        relevance: number;
        reach: number;
        resonance: number;
    };
}

export const PitchScoreCard: React.FC<PitchScoreCardProps> = ({ score, breakdown }) => {
    // Determine color based on score
    const getColor = (val: number) => {
        if (val >= 90) return 'text-visio-accent';
        if (val >= 70) return 'text-visio-teal';
        return 'text-yellow-500';
    };

    const getBgColor = (val: number) => {
        if (val >= 90) return 'bg-visio-accent';
        if (val >= 70) return 'bg-visio-teal';
        return 'bg-yellow-500';
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white/60 mb-6 uppercase tracking-wider">AI Pitch Analysis</h3>

            <div className="flex items-center gap-8">
                {/* Main Score Circle */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                        <circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={364}
                            strokeDashoffset={364 - (364 * score) / 100}
                            className={`${getColor(score)} transition-all duration-1000 ease-out`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-4xl font-bold ${getColor(score)}`}>{score}</span>
                        <span className="text-xs text-white/40 uppercase">Match</span>
                    </div>
                </div>

                {/* Breakdown Bars */}
                <div className="flex-1 space-y-4">
                    <ScoreRow label="Relevance" value={breakdown.relevance} color={getBgColor(breakdown.relevance)} />
                    <ScoreRow label="Reach Quality" value={breakdown.reach} color={getBgColor(breakdown.reach)} />
                    <ScoreRow label="Brand Resonance" value={breakdown.resonance} color={getBgColor(breakdown.resonance)} />
                </div>
            </div>
        </div>
    );
};

const ScoreRow = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-xs font-medium">
            <span className="text-white/60">{label}</span>
            <span className="text-white">{value}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${color}`}
            />
        </div>
    </div>
);
