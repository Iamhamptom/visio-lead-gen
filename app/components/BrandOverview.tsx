import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Zap, Music, Share2, AlertTriangle, CheckCircle, Flame, Target } from 'lucide-react';
import { BrandHealthScore, CampaignSuggestion, calculateBrandHealth, generateCampaignSuggestion } from '@/lib/brandStandards';
import { ArtistProfile, ArtistAnalytics } from '../types';
import { ShinyButton } from './ui/ShinyButton';

interface BrandOverviewProps {
    profile: ArtistProfile;
    analytics: ArtistAnalytics;
}

const GRADE_CONFIG = {
    exceptional: { label: '🔥 Exceptional', color: 'text-orange-400', bg: 'bg-orange-500/10', ring: 'ring-orange-500' },
    strong: { label: '✅ Strong', color: 'text-green-400', bg: 'bg-green-500/10', ring: 'ring-green-500' },
    developing: { label: '⚠️ Developing', color: 'text-yellow-400', bg: 'bg-yellow-500/10', ring: 'ring-yellow-500' },
    needs_attention: { label: '🔴 Needs Attention', color: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500' },
};

const CATEGORY_ICONS = {
    socialReach: <Users size={16} />,
    engagementRate: <Zap size={16} />,
    contentConsistency: <Share2 size={16} />,
    streamingMomentum: <Music size={16} />,
    platformDiversification: <Target size={16} />,
};

const CATEGORY_LABELS: Record<string, string> = {
    socialReach: 'Social Reach',
    engagementRate: 'Engagement Rate',
    contentConsistency: 'Content Consistency',
    streamingMomentum: 'Streaming Momentum',
    platformDiversification: 'Platform Diversification',
};

export const BrandOverview: React.FC<BrandOverviewProps> = ({ profile, analytics }) => {
    const health = calculateBrandHealth(profile, analytics);
    const campaign = generateCampaignSuggestion(profile, analytics);
    const gradeConfig = GRADE_CONFIG[health.grade];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">

            {/* Brand Header */}
            <div className="flex flex-col md:flex-row gap-6 items-start">

                {/* Health Score Ring */}
                <div className="relative flex-shrink-0">
                    <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                            cx="64" cy="64" r="56"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="8"
                            fill="none"
                        />
                        <motion.circle
                            cx="64" cy="64" r="56"
                            stroke={health.grade === 'exceptional' ? '#f97316' : health.grade === 'strong' ? '#22c55e' : health.grade === 'developing' ? '#eab308' : '#ef4444'}
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${(health.overall / 100) * 352} 352`}
                            initial={{ strokeDasharray: '0 352' }}
                            animate={{ strokeDasharray: `${(health.overall / 100) * 352} 352` }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-white">{health.overall}</span>
                        <span className="text-xs text-white/40">/ 100</span>
                    </div>
                </div>

                {/* Brand Summary */}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${gradeConfig.bg} ${gradeConfig.color}`}>
                            {gradeConfig.label}
                        </span>
                    </div>
                    <p className="text-white/50 text-sm mb-4">
                        {profile.genre} • {profile.location.city}, {profile.location.country}
                        {profile.website && <> • <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-visio-teal hover:underline">{profile.website.replace(/https?:\/\//, '')}</a></>}
                    </p>
                    <p className="text-white/70 text-sm leading-relaxed max-w-xl">
                        {profile.description}
                    </p>
                </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-visio-teal" />
                    Category Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {Object.entries(health.categories).map(([key, value]) => (
                        <div key={key} className="text-center p-4 bg-white/5 rounded-xl">
                            <div className="w-10 h-10 mx-auto rounded-full bg-white/10 flex items-center justify-center text-white/60 mb-2">
                                {CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS]}
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">{value}</div>
                            <div className="text-xs text-white/40">{CATEGORY_LABELS[key]}</div>
                            <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full rounded-full ${value >= 70 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${value}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Insights & Tips */}
            {health.insights.length > 0 && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} />
                        Areas for Improvement
                    </h3>
                    <ul className="space-y-3">
                        {health.insights.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-white/70">
                                <span className="text-yellow-400 mt-0.5">•</span>
                                {insight}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Campaign Suggestion */}
            <div className="bg-gradient-to-br from-visio-teal/10 to-purple-500/10 border border-visio-teal/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Flame size={18} className="text-orange-400" />
                    Recommended Campaign
                </h3>
                <div className="space-y-4">
                    <div>
                        <h4 className="font-medium text-white">{campaign.title}</h4>
                        <p className="text-sm text-white/50 mt-1">Target: {campaign.targetAudience}</p>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">
                        {campaign.angle}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {campaign.platforms.map((platform, idx) => (
                            <span key={idx} className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/60">{platform}</span>
                        ))}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <span className="text-sm text-white/40">Est. Reach: <span className="text-visio-teal font-medium">{campaign.estimatedReach}</span></span>
                        <ShinyButton
                            text="Develop Campaign"
                            className="bg-visio-teal text-white px-6 py-2"
                            onClick={() => window.dispatchEvent(new CustomEvent('visio:develop-campaign'))}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
};
