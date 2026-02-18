/**
 * Visio Social Media Search
 * 
 * Platform-targeted search using Google's site: operator.
 * Finds profiles, influencers, and creators across social platforms.
 * Zero API cost — uses Serper's Google Search.
 */

import { performGoogleSearch, SerperResult } from './serper';

// ─── Types ─────────────────────────────────────────────
export interface SocialProfile {
    platform: string;
    name: string;
    url: string;
    handle?: string;
    bio?: string;
    source: string;
}

// ─── Platform Search Functions ─────────────────────────

/** Extract handle from a social media URL */
function extractHandle(url: string, platform: string): string {
    try {
        const parsed = new URL(url);
        const path = parsed.pathname.replace(/\/$/, '');
        const segments = path.split('/').filter(Boolean);

        switch (platform) {
            case 'instagram':
            case 'soundcloud':
                return segments[0] ? `@${segments[0]}` : '';
            case 'tiktok':
                return segments[0] || '';
            case 'twitter':
                return segments[0] ? `@${segments[0]}` : '';
            case 'youtube':
                if (segments[0] === '@') return `@${segments[1] || ''}`;
                if (segments[0]?.startsWith('@')) return segments[0];
                return segments[1] || segments[0] || '';
            case 'linkedin':
                return segments[1] || '';
            default:
                return segments[0] || '';
        }
    } catch {
        return '';
    }
}

/** Convert Serper results to SocialProfile format */
function mapToProfiles(results: SerperResult[], platform: string): SocialProfile[] {
    return results.map(r => ({
        platform,
        name: r.title.split(' | ')[0].split(' - ')[0].split(' • ')[0].trim(),
        url: r.link,
        handle: extractHandle(r.link, platform),
        bio: r.snippet,
        source: `Google (site:${platform})`
    }));
}

// ─── Individual Platform Searches ──────────────────────

/** Check if query already contains music/entertainment context */
function hasMusicContext(query: string): boolean {
    const musicKeywords = [
        'music', 'artist', 'rapper', 'dj', 'producer', 'label', 'song', 'album',
        'genre', 'playlist', 'curator', 'radio', 'hip-hop', 'amapiano', 'afrobeats',
        'gqom', 'r&b', 'pop', 'rock', 'jazz', 'dance', 'dancer', 'singer',
        'songwriter', 'entertainment', 'media', 'press', 'journalist', 'blogger',
        'influencer', 'content creator', 'promoter', 'festival', 'concert'
    ];
    const lower = query.toLowerCase();
    return musicKeywords.some(k => lower.includes(k));
}

export async function searchInstagram(query: string, country: string = 'ZA'): Promise<SocialProfile[]> {
    // Only append "music" if query doesn't already have relevant context
    const contextSuffix = hasMusicContext(query) ? '' : ' music';
    const results = await performGoogleSearch(`site:instagram.com ${query}${contextSuffix}`, country);
    return mapToProfiles(results, 'instagram')
        .filter(p => !p.url.includes('/p/') && !p.url.includes('/reel/')); // Exclude posts
}

export async function searchTikTok(query: string, country: string = 'ZA'): Promise<SocialProfile[]> {
    // Only append "music" if query doesn't already have relevant context
    const contextSuffix = hasMusicContext(query) ? '' : ' music';
    const results = await performGoogleSearch(`site:tiktok.com/@ ${query}${contextSuffix}`, country);
    return mapToProfiles(results, 'tiktok')
        .filter(p => p.url.includes('/@')); // Only profile pages
}

export async function searchTwitter(query: string, country: string = 'ZA'): Promise<SocialProfile[]> {
    // Only append generic music context if query doesn't have its own context
    const contextSuffix = hasMusicContext(query) ? '' : ' music OR journalist OR curator OR blogger';
    const results = await performGoogleSearch(`site:x.com ${query}${contextSuffix}`, country);
    return mapToProfiles(results, 'twitter')
        .filter(p => !p.url.includes('/status/')); // Exclude individual tweets
}

export async function searchYouTube(query: string, country: string = 'ZA'): Promise<SocialProfile[]> {
    const contextSuffix = hasMusicContext(query) ? ' channel' : ' music channel';
    const results = await performGoogleSearch(`site:youtube.com ${query}${contextSuffix}`, country);
    return mapToProfiles(results, 'youtube')
        .filter(p => p.url.includes('/channel/') || p.url.includes('/c/') || p.url.includes('/@'));
}

export async function searchLinkedIn(query: string, country: string = 'ZA'): Promise<SocialProfile[]> {
    const contextSuffix = hasMusicContext(query) ? '' : ' music entertainment PR';
    const results = await performGoogleSearch(`site:linkedin.com/in ${query}${contextSuffix}`, country);
    return mapToProfiles(results, 'linkedin');
}

export async function searchSoundCloud(query: string, country: string = 'ZA'): Promise<SocialProfile[]> {
    const results = await performGoogleSearch(`site:soundcloud.com ${query}`, country);
    return mapToProfiles(results, 'soundcloud')
        .filter(p => p.url.split('/').filter(Boolean).length <= 4); // Exclude individual tracks
}

export async function searchSpotifyArtists(query: string, country: string = 'ZA'): Promise<SocialProfile[]> {
    const results = await performGoogleSearch(`site:open.spotify.com/artist ${query}`, country);
    return mapToProfiles(results, 'spotify');
}

// ─── Multi-Platform Search ─────────────────────────────

export type SocialPlatform = 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'linkedin' | 'soundcloud' | 'spotify';

const PLATFORM_SEARCH_MAP: Record<SocialPlatform, (q: string, c: string) => Promise<SocialProfile[]>> = {
    instagram: searchInstagram,
    tiktok: searchTikTok,
    twitter: searchTwitter,
    youtube: searchYouTube,
    linkedin: searchLinkedIn,
    soundcloud: searchSoundCloud,
    spotify: searchSpotifyArtists
};

/**
 * Search across multiple social platforms simultaneously.
 * Defaults to Instagram, TikTok, Twitter, and LinkedIn.
 */
export async function searchAllSocials(
    query: string,
    country: string = 'ZA',
    platforms: SocialPlatform[] = ['instagram', 'tiktok', 'twitter', 'linkedin']
): Promise<Record<string, SocialProfile[]>> {
    console.log(`[SocialSearch] Searching ${platforms.join(', ')} for "${query}" in ${country}`);

    const results: Record<string, SocialProfile[]> = {};

    const promises = platforms.map(async (platform) => {
        const searchFn = PLATFORM_SEARCH_MAP[platform];
        if (!searchFn) return;
        try {
            results[platform] = await searchFn(query, country);
            console.log(`[SocialSearch] ${platform}: ${results[platform].length} profiles found`);
        } catch (e) {
            console.error(`[SocialSearch] ${platform} failed:`, e);
            results[platform] = [];
        }
    });

    await Promise.allSettled(promises);

    return results;
}

/**
 * Flatten multi-platform results into a single array.
 */
export function flattenSocialResults(results: Record<string, SocialProfile[]>): SocialProfile[] {
    return Object.values(results).flat();
}
