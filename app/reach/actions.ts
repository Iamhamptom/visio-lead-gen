'use server';

import { ReachResult, BatchReachResult, Placement, ReachScenario } from '../types';

interface ReachInput {
    followers: number;
    avgViews: number;
    engagementRate: number;
    placement: Placement;
    cost: number;
}

interface BatchReachInput {
    csvData: string; // Raw CSV string
    placement: Placement;
    cost: number; // Total budget
}

// Helper to calculate a single scenario
const calculateScenario = (
    followers: number,
    engagementRate: number,
    placement: Placement,
    cost: number,
    multiplier: number // 0.7 (Low), 1.0 (Base), 1.4 + Viral (High)
): ReachScenario => {

    const count = placement.count || 1;
    let reachRateBase = 0.25; // Default 25%

    if (placement.type === 'story') reachRateBase = 0.15;
    if (placement.type === 'reel') reachRateBase = 0.40;
    if (placement.type === 'shoutout') reachRateBase = 0.35;

    const estReach = Math.floor(followers * reachRateBase * multiplier * count);
    const estImpressions = Math.floor(estReach * 1.25);
    const estEngagement = Math.floor(estImpressions * (engagementRate / 100));

    // Clicks (Assumed CTR 1% - 3% of reach)
    const ctr = placement.type === 'story' ? 0.05 : 0.015;
    const estClicks = Math.floor(estReach * ctr);

    // Cost Calculations
    const cpm = estImpressions > 0 ? (cost / estImpressions) * 1000 : 0;
    const cpc = estClicks > 0 ? cost / estClicks : 0;
    const cpe = estEngagement > 0 ? cost / estEngagement : 0;

    return {
        reach: estReach,
        impressions: estImpressions,
        engagement: estEngagement,
        clicks: estClicks,
        cpm: Number(cpm.toFixed(2)),
        cpc: Number(cpc.toFixed(2)),
        cpe: Number(cpe.toFixed(2))
    };
};

export async function calculateReach(input: ReachInput): Promise<ReachResult> {
    await new Promise(resolve => setTimeout(resolve, 800));
    const { followers, avgViews, engagementRate, placement, cost } = input;

    let viralFactor = placement.type === 'reel' ? 1.5 : 1.0;

    return {
        id: crypto.randomUUID(),
        targetId: 'custom',
        inputStats: { followers, avgViews, engagementRate },
        placement,
        cost,
        scenarios: {
            low: calculateScenario(followers, engagementRate, placement, cost, 0.7),
            base: calculateScenario(followers, engagementRate, placement, cost, 1.0),
            high: calculateScenario(followers, engagementRate, placement, cost, 1.4 * viralFactor)
        },
        timestamp: Date.now()
    };
}

export async function calculateBatchReach(input: BatchReachInput): Promise<BatchReachResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    const { csvData, placement, cost } = input;

    // Parse CSV (Simple implementation)
    // format: handle,followers,engagement
    const lines = csvData.trim().split('\n');
    let totalFollowers = 0;
    let totalEngagementSum = 0;
    let pageCount = 0;

    // Skip header if present
    const startIndex = lines[0].toLowerCase().includes('followers') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length >= 2) {
            // Try to find numeric columns. Convention: col 1 = followers, col 2 = ER (or col 2 = views, col 3 = ER)
            // Let's assume strict format: handle, followers, engagement_rate
            const followers = parseInt(parts[1].replace(/[^0-9]/g, '')) || 0;
            const er = parseFloat(parts[2]?.replace(/[^0-9.]/g, '')) || 2.5; // Default 2.5% if missing

            totalFollowers += followers;
            totalEngagementSum += (er * followers); // Weighted average
            pageCount++;
        }
    }

    const avgEngagementRate = totalFollowers > 0 ? totalEngagementSum / totalFollowers : 0;
    let viralFactor = placement.type === 'reel' ? 1.5 : 1.0;

    return {
        id: crypto.randomUUID(),
        totalFollowers,
        avgEngagementRate,
        pageCount,
        placement,
        totalCost: cost,
        scenarios: {
            low: calculateScenario(totalFollowers, avgEngagementRate, placement, cost, 0.7),
            base: calculateScenario(totalFollowers, avgEngagementRate, placement, cost, 1.0),
            high: calculateScenario(totalFollowers, avgEngagementRate, placement, cost, 1.4 * viralFactor)
        },
        timestamp: Date.now()
    };
}
