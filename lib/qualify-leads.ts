/**
 * Visio Lead Qualification Engine
 *
 * Verifies and qualifies leads by scraping their actual profiles.
 * Uses Apify scrapers strategically to:
 * - Verify follower counts
 * - Check last post date (activity/recency)
 * - Read bio/about for niche identification
 * - Confirm location
 * - Identify page type (dancer, culture page, music, etc.)
 * - Check for website links
 * - Score and rank leads by relevance
 */

import { PipelineContact } from './lead-pipeline';

// ─── Types ─────────────────────────────────────────────

export interface QualifiedLead extends PipelineContact {
    /** Verified follower count from the actual profile */
    verifiedFollowers?: number;
    /** When the account last posted (ISO date string) */
    lastPostDate?: string;
    /** Whether the account posted within the last 30 days */
    isActive: boolean;
    /** Bio/description from the actual profile */
    bio?: string;
    /** Detected niche/category from bio and recent content */
    detectedNiche?: string;
    /** Detected location from the profile */
    detectedLocation?: string | null;
    /** Website URL from the profile, if any */
    websiteUrl?: string;
    /** Profile picture URL */
    profilePicUrl?: string;
    /** Engagement rate (likes+comments / followers) */
    engagementRate?: number;
    /** Recent post topics/hashtags */
    recentHashtags?: string[];
    /** Qualification score 0-100 */
    qualityScore: number;
    /** Reasons for the quality score */
    qualityReasons: string[];
    /** Whether this profile was actually verified via scraping */
    wasVerified: boolean;
}

export interface QualificationConfig {
    /** The user's query context — what they're looking for */
    entityType: string;
    /** Specific niche/genre they want */
    niche: string;
    /** Location they specified */
    targetLocation: string;
    /** Platform preference */
    platform: string;
    /** Max number of leads to qualify (scraping is expensive) */
    maxToQualify: number;
}

// ─── Apify TikTok Profile Scraper ──────────────────────

interface TikTokProfileData {
    username: string;
    nickname: string;
    bio: string;
    followers: number;
    following: number;
    likes: number;
    videos: number;
    verified: boolean;
    profilePic: string;
    link?: string;
    recentPosts?: Array<{
        desc: string;
        createTime: string;
        playCount: number;
        diggCount: number;
        commentCount: number;
        hashtags: string[];
    }>;
}

async function scrapeTikTokProfile(username: string): Promise<TikTokProfileData | null> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) return null;

    // Clean username — handle URLs, @prefix, etc.
    let cleanUsername = username;
    if (username.includes('tiktok.com/@')) {
        try {
            const url = new URL(username.startsWith('http') ? username : `https://${username}`);
            cleanUsername = url.pathname.split('/').filter(Boolean).find(s => s.startsWith('@')) || username;
        } catch { /* use as-is */ }
    }
    cleanUsername = cleanUsername.replace(/^@/, '').replace(/\/$/, '').split('?')[0];

    if (!cleanUsername) return null;

    try {
        const response = await fetch(
            `https://api.apify.com/v2/acts/clockworks~free-tiktok-scraper/run-sync-get-dataset-items?token=${token}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profiles: [`https://www.tiktok.com/@${cleanUsername}`],
                    resultsPerPage: 5, // Get a few recent posts too
                    shouldDownloadCovers: false,
                    shouldDownloadVideos: false,
                    shouldDownloadSubtitles: false,
                }),
                signal: AbortSignal.timeout(60000),
            }
        );

        if (!response.ok) return null;
        const items = await response.json();
        if (!items || items.length === 0) return null;

        // The scraper may return posts or profile data
        // Look for profile-level data or aggregate from posts
        const firstItem = items[0];
        const authorMeta = firstItem.authorMeta || firstItem.author || {};

        return {
            username: authorMeta.name || authorMeta.uniqueId || cleanUsername,
            nickname: authorMeta.nickName || authorMeta.nickname || '',
            bio: authorMeta.signature || authorMeta.bio || '',
            followers: authorMeta.fans || authorMeta.followers || 0,
            following: authorMeta.following || 0,
            likes: authorMeta.heart || authorMeta.likes || 0,
            videos: authorMeta.video || authorMeta.videoCount || 0,
            verified: authorMeta.verified || false,
            profilePic: authorMeta.avatar || '',
            link: authorMeta.bioLink?.link || '',
            recentPosts: items.slice(0, 5).map((item: any) => ({
                desc: item.text || item.desc || '',
                createTime: item.createTimeISO || item.createTime || '',
                playCount: item.playCount || item.stats?.playCount || 0,
                diggCount: item.diggCount || item.stats?.diggCount || 0,
                commentCount: item.commentCount || item.stats?.commentCount || 0,
                hashtags: (item.hashtags || []).map((h: any) => h.name || h),
            })),
        };
    } catch (error: any) {
        console.error(`[Qualify] TikTok profile scrape failed for @${cleanUsername}:`, error.message);
        return null;
    }
}

// ─── Apify Instagram Profile Scraper ───────────────────

interface InstagramProfileData {
    username: string;
    fullName: string;
    bio: string;
    followers: number;
    following: number;
    posts: number;
    verified: boolean;
    profilePic: string;
    externalUrl?: string;
    isBusinessAccount: boolean;
    businessCategory?: string;
    recentPosts?: Array<{
        caption: string;
        timestamp: string;
        likes: number;
        comments: number;
        hashtags: string[];
    }>;
}

async function scrapeInstagramProfile(username: string): Promise<InstagramProfileData | null> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) return null;

    // Clean username
    let cleanUsername = username;
    if (username.includes('instagram.com/')) {
        try {
            const url = new URL(username.startsWith('http') ? username : `https://${username}`);
            cleanUsername = url.pathname.split('/').filter(Boolean)[0] || username;
        } catch { /* use as-is */ }
    }
    cleanUsername = cleanUsername.replace(/^@/, '').replace(/\/$/, '').split('?')[0];
    if (!cleanUsername) return null;

    try {
        const response = await fetch(
            `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usernames: [cleanUsername],
                    resultsLimit: 5,
                }),
                signal: AbortSignal.timeout(60000),
            }
        );

        if (!response.ok) return null;
        const items = await response.json();
        if (!items || items.length === 0) return null;

        const profile = items[0];
        return {
            username: profile.username || cleanUsername,
            fullName: profile.fullName || '',
            bio: profile.biography || profile.bio || '',
            followers: profile.followersCount || profile.followers || 0,
            following: profile.followsCount || profile.following || 0,
            posts: profile.postsCount || profile.posts || 0,
            verified: profile.verified || false,
            profilePic: profile.profilePicUrl || profile.profilePicUrlHD || '',
            externalUrl: profile.externalUrl || profile.website || '',
            isBusinessAccount: profile.isBusinessAccount || false,
            businessCategory: profile.businessCategoryName || profile.categoryName || '',
            recentPosts: (profile.latestPosts || []).slice(0, 5).map((post: any) => ({
                caption: post.caption || '',
                timestamp: post.timestamp || '',
                likes: post.likesCount || 0,
                comments: post.commentsCount || 0,
                hashtags: (post.hashtags || []),
            })),
        };
    } catch (error: any) {
        console.error(`[Qualify] Instagram profile scrape failed for @${cleanUsername}:`, error.message);
        return null;
    }
}

// ─── Activity Check ────────────────────────────────────

function isRecentlyActive(lastPostDate: string | undefined, daysThreshold: number = 60): boolean {
    if (!lastPostDate) return false; // Unknown = assume inactive
    try {
        const postDate = new Date(lastPostDate);
        if (isNaN(postDate.getTime())) return false;
        const daysSince = (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= daysThreshold;
    } catch {
        return false;
    }
}

// ─── Niche Detection ───────────────────────────────────

function detectNiche(bio: string, hashtags: string[], postCaptions: string[]): string {
    const allText = [bio, ...hashtags, ...postCaptions].join(' ').toLowerCase();

    const nichePatterns: [string, RegExp][] = [
        ['dance', /\b(danc(e|er|ing)|choreograph|choreo|moves|footwork|groove)\b/],
        ['amapiano', /\b(amapiano|piano|yanos)\b/],
        ['hip-hop', /\b(hip[\s-]?hop|rap|rapper|bars|freestyle)\b/],
        ['afrobeats', /\b(afrobeat|afro[\s-]?beat|naija)\b/],
        ['gqom', /\b(gqom|durban)\b/],
        ['dj', /\b(dj|disc\s*jockey|mixing|turntabl|decks)\b/],
        ['music production', /\b(produc(er|tion)|beat[\s-]?mak|studio|fl\s?studio|ableton)\b/],
        ['fashion', /\b(fashion|style|model|runway|designer|outfit)\b/],
        ['comedy', /\b(comed(y|ian)|funny|humor|skit|jokes)\b/],
        ['lifestyle', /\b(lifestyle|vlog|daily|routine)\b/],
        ['fitness', /\b(fitness|gym|workout|training|muscle)\b/],
        ['food', /\b(food|cook|chef|recipe|kitchen)\b/],
        ['beauty', /\b(beauty|makeup|skincare|cosmetic)\b/],
        ['music', /\b(music|song|album|track|single|artist|singer|vocal|acoustic)\b/],
        ['culture', /\b(culture|heritage|tradition|communit|township|african)\b/],
        ['influencer', /\b(influenc|content\s*creat|brand\s*ambassador|collab)\b/],
    ];

    const detected: string[] = [];
    for (const [niche, pattern] of nichePatterns) {
        if (pattern.test(allText)) {
            detected.push(niche);
        }
    }

    return detected.slice(0, 3).join(', ') || 'general';
}

// ─── Location Detection ────────────────────────────────

function detectLocation(bio: string, allText: string): string | null {
    const combinedText = `${bio} ${allText}`.toLowerCase();

    // SA cities/townships
    const saLocations = [
        'soweto', 'johannesburg', 'joburg', 'jozi', 'pretoria', 'tshwane',
        'cape town', 'durban', 'ethekwini', 'port elizabeth', 'gqeberha',
        'bloemfontein', 'east london', 'polokwane', 'nelspruit', 'mbombela',
        'pietermaritzburg', 'kimberley', 'rustenburg', 'sandton', 'rosebank',
        'braamfontein', 'newtown', 'melville', 'alexandra', 'khayelitsha',
        'gugulethu', 'langa', 'mitchells plain', 'mamelodi', 'soshanguve',
        'centurion', 'midrand', 'randburg', 'benoni', 'boksburg', 'germiston',
        'mpumalanga', 'limpopo', 'gauteng', 'kzn', 'kwazulu-natal', 'western cape',
        'eastern cape', 'free state', 'north west', 'northern cape',
    ];

    // International cities
    const intlLocations = [
        'london', 'manchester', 'birmingham', 'lagos', 'accra', 'nairobi',
        'new york', 'los angeles', 'atlanta', 'toronto', 'paris', 'berlin',
    ];

    // Check SA locations first
    for (const loc of saLocations) {
        if (combinedText.includes(loc)) return loc.charAt(0).toUpperCase() + loc.slice(1);
    }

    // Check international
    for (const loc of intlLocations) {
        if (combinedText.includes(loc)) return loc.charAt(0).toUpperCase() + loc.slice(1);
    }

    // Check country-level
    if (combinedText.includes('south africa') || combinedText.includes('🇿🇦') || combinedText.includes('mzansi')) return 'South Africa';
    if (combinedText.includes('nigeria') || combinedText.includes('🇳🇬')) return 'Nigeria';
    if (combinedText.includes('uk') || combinedText.includes('united kingdom') || combinedText.includes('🇬🇧')) return 'UK';

    return null;
}

// ─── Quality Scoring ───────────────────────────────────

function scoreQuality(
    lead: PipelineContact,
    profileData: { followers: number; isActive: boolean; bio: string; detectedNiche: string; detectedLocation?: string | null; hasWebsite: boolean; engagementRate: number },
    config: QualificationConfig,
): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // 1. Has real profile data (was successfully scraped)
    score += 15;
    reasons.push('Profile verified');

    // 2. Follower count thresholds
    if (profileData.followers >= 10000) {
        score += 15;
        reasons.push(`${(profileData.followers / 1000).toFixed(0)}K+ followers`);
    } else if (profileData.followers >= 1000) {
        score += 10;
        reasons.push(`${(profileData.followers / 1000).toFixed(1)}K followers`);
    } else if (profileData.followers >= 100) {
        score += 5;
        reasons.push(`${profileData.followers} followers`);
    } else {
        reasons.push(`Low followers (${profileData.followers})`);
    }

    // 3. Activity — recently posted
    if (profileData.isActive) {
        score += 15;
        reasons.push('Active (posted recently)');
    } else {
        reasons.push('Inactive or unknown posting date');
    }

    // 4. Niche match
    if (config.entityType || config.niche) {
        const targetNiche = `${config.entityType} ${config.niche}`.toLowerCase();
        const detectedNicheLower = profileData.detectedNiche.toLowerCase();
        const nicheWords = targetNiche.split(/\s+/).filter(w => w.length > 2);
        const nicheMatch = nicheWords.some(w => detectedNicheLower.includes(w));

        if (nicheMatch) {
            score += 20;
            reasons.push(`Niche match: ${profileData.detectedNiche}`);
        } else if (profileData.detectedNiche !== 'general') {
            score += 5;
            reasons.push(`Niche: ${profileData.detectedNiche} (partial match)`);
        } else {
            reasons.push('Niche unclear');
        }
    } else {
        score += 10; // No specific niche requested, give partial credit
    }

    // 5. Location match
    if (config.targetLocation) {
        const targetLoc = config.targetLocation.toLowerCase();
        if (profileData.detectedLocation) {
            const detected = profileData.detectedLocation.toLowerCase();
            if (detected.includes(targetLoc) || targetLoc.includes(detected)) {
                score += 15;
                reasons.push(`Location match: ${profileData.detectedLocation}`);
            } else {
                score += 3;
                reasons.push(`Location: ${profileData.detectedLocation} (not exact match)`);
            }
        } else {
            reasons.push('Location not detected in profile');
        }
    } else {
        score += 5; // No location requested
    }

    // 6. Has bio content
    if (profileData.bio && profileData.bio.length > 10) {
        score += 5;
    }

    // 7. Has website
    if (profileData.hasWebsite) {
        score += 5;
        reasons.push('Has website link');
    }

    // 8. Engagement rate
    if (profileData.engagementRate > 5) {
        score += 10;
        reasons.push(`High engagement (${profileData.engagementRate.toFixed(1)}%)`);
    } else if (profileData.engagementRate > 2) {
        score += 5;
        reasons.push(`Good engagement (${profileData.engagementRate.toFixed(1)}%)`);
    }

    return { score: Math.min(score, 100), reasons };
}

// ─── Main Qualification Pipeline ───────────────────────

/**
 * Takes raw pipeline contacts and qualifies them by actually
 * scraping their profiles. Returns qualified leads sorted by
 * quality score, with full intelligence data.
 *
 * This is the "smart" step — it turns raw search results into
 * verified, scored, qualified leads with real data.
 */
export async function qualifyLeads(
    contacts: PipelineContact[],
    config: QualificationConfig,
): Promise<{ qualified: QualifiedLead[]; logs: string[] }> {
    const logs: string[] = [];
    const hasApify = !!process.env.APIFY_API_TOKEN;

    logs.push(`[Qualify] Starting qualification of ${contacts.length} contacts (max: ${config.maxToQualify})`);
    logs.push(`[Qualify] Target: ${config.entityType || 'any'} | Niche: ${config.niche || 'any'} | Location: ${config.targetLocation || 'any'} | Platform: ${config.platform || 'any'}`);

    if (!hasApify) {
        logs.push('[Qualify] Apify not available — using basic qualification (no profile scraping)');
    }

    // Sort candidates: prioritize those with platform handles we can verify
    const candidates = [...contacts].sort((a, b) => {
        let scoreA = 0, scoreB = 0;

        // Prefer contacts that have the target platform handle
        if (config.platform === 'tiktok') {
            if (a.tiktok) scoreA += 10;
            if (b.tiktok) scoreB += 10;
        } else if (config.platform === 'instagram') {
            if (a.instagram) scoreA += 10;
            if (b.instagram) scoreB += 10;
        }

        // Prefer contacts with any social handle (can be verified)
        if (a.tiktok || a.instagram) scoreA += 3;
        if (b.tiktok || b.instagram) scoreB += 3;

        // Prefer higher existing confidence
        const confRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
        scoreA += confRank[a.confidence] || 0;
        scoreB += confRank[b.confidence] || 0;

        return scoreB - scoreA;
    });

    const toQualify = candidates.slice(0, config.maxToQualify);
    const qualified: QualifiedLead[] = [];

    // Process in batches of 3 to avoid overwhelming Apify
    const batchSize = 3;
    for (let i = 0; i < toQualify.length; i += batchSize) {
        const batch = toQualify.slice(i, i + batchSize);

        const batchResults = await Promise.allSettled(
            batch.map(contact => qualifySingleLead(contact, config, hasApify))
        );

        for (const result of batchResults) {
            if (result.status === 'fulfilled' && result.value) {
                qualified.push(result.value);
            }
        }

        logs.push(`[Qualify] Batch ${Math.floor(i / batchSize) + 1}: ${qualified.length} qualified so far`);
    }

    // Also add unqualified contacts (those we didn't scrape) with basic scoring
    const qualifiedNames = new Set(qualified.map(q => q.name.toLowerCase()));
    for (const contact of candidates.slice(config.maxToQualify)) {
        if (!qualifiedNames.has(contact.name.toLowerCase())) {
            qualified.push({
                ...contact,
                isActive: false,
                qualityScore: contact.confidence === 'high' ? 30 : contact.confidence === 'medium' ? 20 : 10,
                qualityReasons: ['Not verified (over qualification limit)'],
                wasVerified: false,
            });
        }
    }

    // Sort by quality score (highest first)
    qualified.sort((a, b) => b.qualityScore - a.qualityScore);

    const verifiedCount = qualified.filter(q => q.wasVerified).length;
    const activeCount = qualified.filter(q => q.isActive).length;
    const avgScore = qualified.length > 0
        ? (qualified.reduce((s, q) => s + q.qualityScore, 0) / qualified.length).toFixed(0)
        : '0';

    logs.push(`[Qualify] Done: ${qualified.length} total leads`);
    logs.push(`[Qualify] Verified: ${verifiedCount} | Active: ${activeCount} | Avg Score: ${avgScore}/100`);

    return { qualified, logs };
}

// ─── Single Lead Qualification ─────────────────────────

async function qualifySingleLead(
    contact: PipelineContact,
    config: QualificationConfig,
    hasApify: boolean,
): Promise<QualifiedLead> {
    // Default to basic qualification
    let result: QualifiedLead = {
        ...contact,
        isActive: false,
        qualityScore: 0,
        qualityReasons: [],
        wasVerified: false,
    };

    // Try to scrape the actual profile if Apify is available
    if (hasApify) {
        try {
            // Determine which platform to scrape based on available data
            if ((config.platform === 'tiktok' || !config.platform) && contact.tiktok) {
                const profile = await scrapeTikTokProfile(contact.tiktok);
                if (profile) {
                    const lastPost = profile.recentPosts?.[0]?.createTime;
                    const allCaptions = (profile.recentPosts || []).map(p => p.desc);
                    const allHashtags = (profile.recentPosts || []).flatMap(p => p.hashtags);
                    const totalEngagement = (profile.recentPosts || []).reduce((s, p) => s + p.diggCount + p.commentCount, 0);
                    const totalPlays = (profile.recentPosts || []).reduce((s, p) => s + p.playCount, 0);

                    result.verifiedFollowers = profile.followers;
                    result.lastPostDate = lastPost;
                    result.isActive = isRecentlyActive(lastPost);
                    result.bio = profile.bio;
                    result.detectedNiche = detectNiche(profile.bio, allHashtags, allCaptions);
                    result.detectedLocation = detectLocation(profile.bio, allCaptions.join(' '));
                    result.websiteUrl = profile.link || undefined;
                    result.profilePicUrl = profile.profilePic;
                    result.engagementRate = totalPlays > 0 ? (totalEngagement / totalPlays) * 100 : 0;
                    result.recentHashtags = [...new Set(allHashtags)].slice(0, 10);
                    result.wasVerified = true;
                    result.name = profile.nickname || contact.name;
                    result.tiktok = `@${profile.username}`;
                    result.followers = `${(profile.followers / 1000).toFixed(1)}K`;

                    const scoring = scoreQuality(contact, {
                        followers: profile.followers,
                        isActive: result.isActive,
                        bio: profile.bio,
                        detectedNiche: result.detectedNiche,
                        detectedLocation: result.detectedLocation,
                        hasWebsite: !!profile.link,
                        engagementRate: result.engagementRate,
                    }, config);

                    result.qualityScore = scoring.score;
                    result.qualityReasons = scoring.reasons;
                    return result;
                }
            }

            if ((config.platform === 'instagram' || !config.platform) && contact.instagram) {
                const profile = await scrapeInstagramProfile(contact.instagram);
                if (profile) {
                    const lastPost = profile.recentPosts?.[0]?.timestamp;
                    const allCaptions = (profile.recentPosts || []).map(p => p.caption);
                    const allHashtags = (profile.recentPosts || []).flatMap(p => p.hashtags);
                    const totalEngagement = (profile.recentPosts || []).reduce((s, p) => s + p.likes + p.comments, 0);
                    const postCount = profile.recentPosts?.length || 1;

                    result.verifiedFollowers = profile.followers;
                    result.lastPostDate = lastPost;
                    result.isActive = isRecentlyActive(lastPost);
                    result.bio = profile.bio;
                    result.detectedNiche = profile.businessCategory || detectNiche(profile.bio, allHashtags, allCaptions);
                    result.detectedLocation = detectLocation(profile.bio, allCaptions.join(' '));
                    result.websiteUrl = profile.externalUrl || undefined;
                    result.profilePicUrl = profile.profilePic;
                    result.engagementRate = profile.followers > 0
                        ? (totalEngagement / postCount / profile.followers) * 100
                        : 0;
                    result.recentHashtags = [...new Set(allHashtags)].slice(0, 10);
                    result.wasVerified = true;
                    result.name = profile.fullName || contact.name;
                    result.instagram = `@${profile.username}`;
                    result.followers = `${(profile.followers / 1000).toFixed(1)}K`;

                    const scoring = scoreQuality(contact, {
                        followers: profile.followers,
                        isActive: result.isActive,
                        bio: profile.bio,
                        detectedNiche: result.detectedNiche,
                        detectedLocation: result.detectedLocation,
                        hasWebsite: !!profile.externalUrl,
                        engagementRate: result.engagementRate,
                    }, config);

                    result.qualityScore = scoring.score;
                    result.qualityReasons = scoring.reasons;
                    return result;
                }
            }
        } catch (error: any) {
            console.error(`[Qualify] Profile scrape failed for ${contact.name}:`, error.message);
        }
    }

    // Fallback: basic scoring without profile verification
    const basicScore = (contact.email ? 15 : 0)
        + (contact.confidence === 'high' ? 15 : contact.confidence === 'medium' ? 10 : 5)
        + (contact.tiktok || contact.instagram ? 10 : 0)
        + (contact.followers ? 5 : 0);

    result.qualityScore = Math.min(basicScore, 50); // Cap at 50 for unverified
    result.qualityReasons = ['Unverified (basic scoring only)'];
    if (contact.email) result.qualityReasons.push('Has email');
    if (contact.tiktok || contact.instagram) result.qualityReasons.push('Has social handle');

    return result;
}

// ─── Format Qualified Leads for AI Synthesis ───────────

/**
 * Formats qualified leads into a structured context string that
 * the AI can use to synthesize an intelligent response.
 * Includes all verification data so the AI can present it properly.
 */
export function formatQualifiedLeadsForSynthesis(leads: QualifiedLead[]): string {
    if (leads.length === 0) return 'No qualified leads found.';

    let context = '## QUALIFIED & VERIFIED LEADS\n\n';

    for (const lead of leads) {
        context += `### ${lead.name}`;
        if (lead.wasVerified) context += ' ✅ VERIFIED';
        context += '\n';

        context += `- **Quality Score:** ${lead.qualityScore}/100\n`;
        context += `- **Score Reasons:** ${lead.qualityReasons.join(', ')}\n`;

        if (lead.verifiedFollowers) context += `- **Followers:** ${lead.verifiedFollowers.toLocaleString()} (verified)\n`;
        else if (lead.followers) context += `- **Followers:** ${lead.followers} (unverified)\n`;

        if (lead.isActive) context += `- **Status:** Active (last post: ${lead.lastPostDate || 'recent'})\n`;
        else context += `- **Status:** Inactive or unknown\n`;

        if (lead.bio) context += `- **Bio:** ${lead.bio.slice(0, 200)}\n`;
        if (lead.detectedNiche) context += `- **Detected Niche:** ${lead.detectedNiche}\n`;
        if (lead.detectedLocation) context += `- **Location:** ${lead.detectedLocation}\n`;
        if (lead.websiteUrl) context += `- **Website:** ${lead.websiteUrl}\n`;
        if (lead.engagementRate) context += `- **Engagement Rate:** ${lead.engagementRate.toFixed(1)}%\n`;

        if (lead.tiktok) context += `- **TikTok:** ${lead.tiktok}\n`;
        if (lead.instagram) context += `- **Instagram:** ${lead.instagram}\n`;
        if (lead.twitter) context += `- **Twitter:** ${lead.twitter}\n`;
        if (lead.email) context += `- **Email:** ${lead.email}\n`;
        if (lead.company) context += `- **Company:** ${lead.company}\n`;

        if (lead.recentHashtags && lead.recentHashtags.length > 0) {
            context += `- **Recent Hashtags:** ${lead.recentHashtags.map(h => `#${h}`).join(' ')}\n`;
        }

        context += `- **Source:** ${lead.source}\n\n`;
    }

    return context;
}
