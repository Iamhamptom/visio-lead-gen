/**
 * Brand Standards & Scoring Engine
 * Industry benchmarks for artist brand health assessment
 */

import { ArtistAnalytics, ArtistProfile } from '@/app/types';

// ============================================================================
// INDUSTRY BENCHMARKS
// ============================================================================

export const BENCHMARKS = {
    // Social Reach Thresholds
    followers: {
        poor: 1000,
        developing: 5000,
        good: 10000,
        excellent: 50000,
        exceptional: 100000,
    },

    // Engagement Rate (likes + comments / followers * 100)
    engagementRate: {
        poor: 1,
        developing: 2,
        good: 3,
        excellent: 6,
        exceptional: 10,
    },

    // Content Consistency (posts per month)
    postsPerMonth: {
        poor: 2,
        developing: 4,
        good: 8,
        excellent: 15,
        exceptional: 25,
    },

    // Streaming Growth (month-over-month %)
    streamGrowth: {
        poor: 0,
        developing: 2,
        good: 5,
        excellent: 15,
        exceptional: 30,
    },

    // Platform Diversification (# of connected platforms)
    platforms: {
        poor: 1,
        developing: 2,
        good: 3,
        excellent: 5,
        exceptional: 6,
    },
};

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

export const WEIGHTS = {
    socialReach: 0.25,
    engagementRate: 0.25,
    contentConsistency: 0.15,
    streamingMomentum: 0.20,
    platformDiversification: 0.15,
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

function calculateCategoryScore(value: number, benchmark: Record<string, number>): number {
    if (value >= benchmark.exceptional) return 100;
    if (value >= benchmark.excellent) return 80 + ((value - benchmark.excellent) / (benchmark.exceptional - benchmark.excellent)) * 20;
    if (value >= benchmark.good) return 60 + ((value - benchmark.good) / (benchmark.excellent - benchmark.good)) * 20;
    if (value >= benchmark.developing) return 40 + ((value - benchmark.developing) / (benchmark.good - benchmark.developing)) * 20;
    if (value >= benchmark.poor) return 20 + ((value - benchmark.poor) / (benchmark.developing - benchmark.poor)) * 20;
    return Math.max(0, (value / benchmark.poor) * 20);
}

export interface BrandHealthScore {
    overall: number;
    grade: 'exceptional' | 'strong' | 'developing' | 'needs_attention';
    categories: {
        socialReach: number;
        engagementRate: number;
        contentConsistency: number;
        streamingMomentum: number;
        platformDiversification: number;
    };
    insights: string[];
}

export function calculateBrandHealth(
    profile: ArtistProfile,
    analytics: ArtistAnalytics
): BrandHealthScore {
    const totalFollowers = analytics.totalFollowers;
    const socialReachScore = calculateCategoryScore(totalFollowers, BENCHMARKS.followers);

    const igPosts = analytics.instagram.posts;
    const totalEngagement = igPosts.reduce((sum, p) => sum + p.likes + p.comments, 0);
    const engagementRate = analytics.instagram.followers > 0
        ? (totalEngagement / igPosts.length / analytics.instagram.followers) * 100
        : 0;
    const engagementScore = calculateCategoryScore(engagementRate, BENCHMARKS.engagementRate);

    const postsPerMonth = igPosts.length * 4;
    const consistencyScore = calculateCategoryScore(postsPerMonth, BENCHMARKS.postsPerMonth);

    const streams = analytics.spotify.streams;
    const recentStreams = streams.slice(-7).reduce((s, p) => s + p.value, 0);
    const olderStreams = streams.slice(-14, -7).reduce((s, p) => s + p.value, 0);
    const streamGrowth = olderStreams > 0 ? ((recentStreams - olderStreams) / olderStreams) * 100 : 0;
    const momentumScore = calculateCategoryScore(Math.max(0, streamGrowth), BENCHMARKS.streamGrowth);

    const connectedCount = Object.values(profile.connectedAccounts || {}).filter(Boolean).length;
    const diversificationScore = calculateCategoryScore(connectedCount, BENCHMARKS.platforms);

    const overall = Math.round(
        socialReachScore * WEIGHTS.socialReach +
        engagementScore * WEIGHTS.engagementRate +
        consistencyScore * WEIGHTS.contentConsistency +
        momentumScore * WEIGHTS.streamingMomentum +
        diversificationScore * WEIGHTS.platformDiversification
    );

    let grade: BrandHealthScore['grade'] = 'needs_attention';
    if (overall >= 90) grade = 'exceptional';
    else if (overall >= 70) grade = 'strong';
    else if (overall >= 50) grade = 'developing';

    const insights: string[] = [];
    const scores = { socialReachScore, engagementScore, consistencyScore, momentumScore, diversificationScore };
    const weakest = Object.entries(scores).sort((a, b) => a[1] - b[1]).slice(0, 2);

    for (const [category, score] of weakest) {
        if (score < 60) {
            insights.push(generateInsight(category, score));
        }
    }

    return {
        overall,
        grade,
        categories: {
            socialReach: Math.round(socialReachScore),
            engagementRate: Math.round(engagementScore),
            contentConsistency: Math.round(consistencyScore),
            streamingMomentum: Math.round(momentumScore),
            platformDiversification: Math.round(diversificationScore),
        },
        insights,
    };
}

function generateInsight(category: string, score: number): string {
    const tips: Record<string, string> = {
        socialReachScore: `Your follower count is below industry average. Focus on cross-platform promotion and collaborations to grow your audience.`,
        engagementScore: `Your engagement rate is ${score < 40 ? 'low' : 'below average'}. Try posting more interactive content like Reels, Stories polls, and Q&As to boost interaction.`,
        consistencyScore: `Content consistency needs work. Aim to post at least 8-12 times per month to stay visible in algorithms.`,
        momentumScore: `Streaming momentum is slowing. Consider pitching to playlists, releasing singles more frequently, or running targeted ads.`,
        diversificationScore: `You're not on enough platforms. Connect TikTok, YouTube, and Apple Music to maximize your reach and data insights.`,
    };
    return tips[category] || 'Continue improving your brand presence across all channels.';
}

// ============================================================================
// CAMPAIGN SUGGESTION ENGINE
// ============================================================================

export interface CampaignSuggestion {
    title: string;
    targetAudience: string;
    angle: string;
    platforms: string[];
    estimatedReach: string;
}

export function generateCampaignSuggestion(
    profile: ArtistProfile,
    analytics: ArtistAnalytics
): CampaignSuggestion {
    const topRegion = analytics.spotify.topRegions[0]?.region || 'Global';
    const topPlaylist = analytics.spotify.playlists[0]?.name || 'curated playlists';

    return {
        title: `"${profile.name}" Growth Campaign`,
        targetAudience: `Fans of ${profile.similarArtists.slice(0, 2).join(' & ')} in ${topRegion}`,
        angle: `Leverage your presence on "${topPlaylist}" to target listeners who enjoy ${profile.genre} music. Focus on nostalgia-driven visuals and behind-the-scenes content.`,
        platforms: ['Instagram Reels', 'TikTok', 'Spotify Ad Studio'],
        estimatedReach: `${Math.round(analytics.totalFollowers * 2.5).toLocaleString()}+ impressions`,
    };
}
