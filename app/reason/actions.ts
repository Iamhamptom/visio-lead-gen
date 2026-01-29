'use server';

import { PitchBrief, Target } from '../types';

// Mock Targets Data
const MOCK_TARGETS: Target[] = [
    {
        id: '1',
        name: 'Alex Rivera',
        platform: 'instagram',
        handle: '@arivera_music',
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&h=200&fit=crop',
        followers: 45000,
        engagementRate: 4.2,
        tags: ['Indie Pop', 'Festivals', 'Lifestyle'],
        matchScore: 88,
        location: 'Los Angeles, CA'
    },
    {
        id: '2',
        name: 'Synthwave Daily',
        platform: 'blog',
        handle: 'synthwavedaily.com',
        avatarUrl: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=200&h=200&fit=crop',
        followers: 120000,
        engagementRate: 1.5,
        tags: ['Electronic', 'Reviews', 'Premiere'],
        matchScore: 94,
        location: 'Global'
    },
    {
        id: '3',
        name: 'Chill Vibes Playlist',
        platform: 'spotify',
        handle: 'curator_mike',
        avatarUrl: 'https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=200&h=200&fit=crop',
        followers: 850000,
        engagementRate: 0,
        tags: ['Lo-Fi', 'Study', 'Relax'],
        matchScore: 76,
        location: 'Spotify'
    }
];

// Mock Generation Logic
export async function generatePitchBrief(targetId: string, campaignId: string, goal: string): Promise<PitchBrief> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 2000));

    const target = MOCK_TARGETS.find(t => t.id === targetId) || MOCK_TARGETS[0];
    const score = Math.floor(Math.random() * (98 - 70) + 70);

    return {
        id: Date.now().toString(),
        targetId,
        campaignId,
        score,
        scoreBreakdown: {
            relevance: Math.floor(Math.random() * 20) + 80,
            reach: Math.floor(Math.random() * 30) + 70,
            resonance: Math.floor(Math.random() * 15) + 85
        },
        reasons: [
            {
                title: 'High Audience Overlap',
                description: `34% of ${target.name}'s audience also listens to similar artists in your genre.`,
                type: 'pro'
            },
            {
                title: 'Consistent Engagement',
                description: `${target.name} maintains a strong ${target.engagementRate}% engagement rate on recent posts.`,
                type: 'pro'
            },
            {
                title: 'Recent Activity',
                description: 'They posted a track similar to yours 2 days ago, indicating current interest.',
                type: 'insight'
            }
        ],
        valueProps: {
            forThem: [
                'Exclusive premiere rights',
                'Engaging content for their upcoming "New Finds" segment',
                'Cross-promotion to your 12k followers'
            ],
            forUs: [
                'Exposure to 45k highly relevant potential fans',
                'Credibility association with a taste-maker',
                'SEO boost from backlink'
            ],
            angles: [
                'The "Local Hero" angle (LA based)',
                'The "Sound Similar" angle (reference The Midnight)',
                'The "Exclusive Story" angle (Behind the scenes)'
            ]
        },
        copy: {
            emailSubject: `Premiere Request: New Synthwave track for ${target.name}`,
            emailBody: `Hi ${target.name.split(' ')[0]},\n\nI've been following your ${target.platform} content for a while, specifically your recent post about [Topic].\n\nI'm releasing a new track called "Neon Nights" next week that perfectly aligns with the vibe of your audience. It features [Unique Element] which I think your followers would love.\n\nWould you be open to an exclusive premiere?\n\nBest,\n[Your Name]`,
            dmShort: `Hey ${target.name.split(' ')[0]}! 👋 Long time follower. Dropping a track next week that sounds like something you'd dig. Mind if I send a link?`
        },
        generatedAt: Date.now()
    };
}

export async function searchTargets(query: string): Promise<Target[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!query) return MOCK_TARGETS;
    return MOCK_TARGETS.filter(t =>
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.handle.toLowerCase().includes(query.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
}
