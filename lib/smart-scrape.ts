// ============================================================================
// SMART SCRAPE — Social Media Research Engine for V-Prai
// ============================================================================
// Workflow:
//   1. User or V-Prai triggers a research topic
//   2. Search YouTube, TikTok, Instagram, Twitter for high-engagement content
//   3. Scrape top 10 matching videos/posts (by engagement)
//   4. Pull transcripts + comments from top results
//   5. Return structured research data for V-Prai to synthesize
// ============================================================================

export interface SmartScrapeResult {
    query: string;
    platform: string;
    results: ScrapedContent[];
    totalFound: number;
    scrapedAt: number;
}

export interface ScrapedContent {
    title: string;
    url: string;
    platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter';
    author: string;
    authorFollowers?: number;
    views: number;
    likes: number;
    comments: number;
    engagementRate?: number;
    publishedAt?: string;
    transcript?: string;
    topComments?: string[];
    hashtags?: string[];
    duration?: string;
}

export interface SmartScrapeRequest {
    query: string;
    platforms: ('youtube' | 'tiktok' | 'instagram' | 'twitter')[];
    maxResults?: number; // default 10
    minViews?: number;
    sortBy?: 'engagement' | 'views' | 'recent';
}

// ─── YouTube via Apify ──────────────────────────────
async function scrapeYouTube(query: string, maxResults: number = 10): Promise<ScrapedContent[]> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        console.warn('[SmartScrape] APIFY_API_TOKEN not set — YouTube scraping unavailable');
        return [];
    }

    try {
        // Use Apify YouTube Scraper actor
        const response = await fetch('https://api.apify.com/v2/acts/streamers~youtube-scraper/run-sync-get-dataset-items?token=' + token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                searchKeywords: [query],
                maxResults,
                maxResultsShorts: Math.min(maxResults, 5),
                subtitlesLanguage: 'en',
                subtitlesFormat: 'srt',
            }),
            signal: AbortSignal.timeout(120000), // 2 min timeout
        });

        if (!response.ok) {
            console.error('[SmartScrape] Apify YouTube error:', response.status);
            return [];
        }

        const items = await response.json();

        return (items || []).slice(0, maxResults).map((item: any) => ({
            title: item.title || '',
            url: item.url || `https://youtube.com/watch?v=${item.id}`,
            platform: 'youtube' as const,
            author: item.channelName || item.channelUrl || '',
            authorFollowers: item.channelFollowers || 0,
            views: item.viewCount || 0,
            likes: item.likes || 0,
            comments: item.commentsCount || 0,
            engagementRate: item.viewCount > 0
                ? ((item.likes || 0) + (item.commentsCount || 0)) / item.viewCount * 100
                : 0,
            publishedAt: item.date || item.uploadDate || '',
            transcript: item.subtitles?.map((s: any) => s.text).join(' ') || '',
            topComments: (item.comments || []).slice(0, 5).map((c: any) => c.text || c),
            hashtags: item.hashtags || [],
            duration: item.duration || '',
        }));
    } catch (error: any) {
        console.error('[SmartScrape] YouTube scrape error:', error?.message);
        return [];
    }
}

// ─── TikTok via Apify ───────────────────────────────
async function scrapeTikTok(query: string, maxResults: number = 10): Promise<ScrapedContent[]> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) return [];

    try {
        const response = await fetch('https://api.apify.com/v2/acts/clockworks~free-tiktok-scraper/run-sync-get-dataset-items?token=' + token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                searchQueries: [query],
                resultsPerPage: maxResults,
                shouldDownloadCovers: false,
                shouldDownloadVideos: false,
                shouldDownloadSubtitles: true,
            }),
            signal: AbortSignal.timeout(120000),
        });

        if (!response.ok) return [];
        const items = await response.json();

        return (items || []).slice(0, maxResults).map((item: any) => ({
            title: item.text || item.desc || '',
            url: item.webVideoUrl || `https://tiktok.com/@${item.authorMeta?.name}/video/${item.id}`,
            platform: 'tiktok' as const,
            author: item.authorMeta?.name || item.author || '',
            authorFollowers: item.authorMeta?.fans || 0,
            views: item.playCount || item.stats?.playCount || 0,
            likes: item.diggCount || item.stats?.diggCount || 0,
            comments: item.commentCount || item.stats?.commentCount || 0,
            engagementRate: (item.playCount || 0) > 0
                ? ((item.diggCount || 0) + (item.commentCount || 0)) / (item.playCount || 1) * 100
                : 0,
            publishedAt: item.createTimeISO || '',
            transcript: item.subtitles || '',
            topComments: (item.comments || []).slice(0, 5).map((c: any) => c.text || c),
            hashtags: (item.hashtags || []).map((h: any) => h.name || h),
            duration: item.videoMeta?.duration ? `${item.videoMeta.duration}s` : '',
        }));
    } catch (error: any) {
        console.error('[SmartScrape] TikTok scrape error:', error?.message);
        return [];
    }
}

// ─── Twitter/X via Apify ─────────────────────────────
async function scrapeTwitter(query: string, maxResults: number = 10): Promise<ScrapedContent[]> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) return [];

    try {
        const response = await fetch('https://api.apify.com/v2/acts/quacker~twitter-scraper/run-sync-get-dataset-items?token=' + token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                searchTerms: [query],
                maxTweets: maxResults,
                sort: 'Top',
            }),
            signal: AbortSignal.timeout(90000),
        });

        if (!response.ok) return [];
        const items = await response.json();

        return (items || []).slice(0, maxResults).map((item: any) => ({
            title: (item.full_text || item.text || '').slice(0, 200),
            url: item.url || `https://twitter.com/i/status/${item.id}`,
            platform: 'twitter' as const,
            author: item.user?.screen_name || item.author?.userName || '',
            authorFollowers: item.user?.followers_count || item.author?.followers || 0,
            views: item.views || item.viewCount || 0,
            likes: item.favorite_count || item.likeCount || 0,
            comments: item.reply_count || item.replyCount || 0,
            engagementRate: 0,
            publishedAt: item.created_at || item.createdAt || '',
            transcript: item.full_text || item.text || '',
            topComments: [],
            hashtags: (item.entities?.hashtags || []).map((h: any) => h.text || h),
        }));
    } catch (error: any) {
        console.error('[SmartScrape] Twitter scrape error:', error?.message);
        return [];
    }
}

// ─── Main Smart Scrape Orchestrator ──────────────────
export async function performSmartScrape(req: SmartScrapeRequest): Promise<SmartScrapeResult[]> {
    const { query, platforms, maxResults = 10, sortBy = 'engagement' } = req;
    const results: SmartScrapeResult[] = [];

    // Run platform scrapes in parallel
    const scrapers: Promise<{ platform: string; items: ScrapedContent[] }>[] = [];

    for (const platform of platforms) {
        switch (platform) {
            case 'youtube':
                scrapers.push(scrapeYouTube(query, maxResults).then(items => ({ platform: 'youtube', items })));
                break;
            case 'tiktok':
                scrapers.push(scrapeTikTok(query, maxResults).then(items => ({ platform: 'tiktok', items })));
                break;
            case 'twitter':
                scrapers.push(scrapeTwitter(query, maxResults).then(items => ({ platform: 'twitter', items })));
                break;
            // Instagram requires login — skip for now, use TikTok + Twitter instead
            case 'instagram':
                console.log('[SmartScrape] Instagram scraping not yet supported — use TikTok/Twitter');
                break;
        }
    }

    const scraped = await Promise.allSettled(scrapers);

    for (const result of scraped) {
        if (result.status === 'fulfilled') {
            let items = result.value.items;

            // Sort by engagement metric
            if (sortBy === 'engagement') {
                items.sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0));
            } else if (sortBy === 'views') {
                items.sort((a, b) => b.views - a.views);
            } else if (sortBy === 'recent') {
                items.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
            }

            results.push({
                query,
                platform: result.value.platform,
                results: items.slice(0, maxResults),
                totalFound: items.length,
                scrapedAt: Date.now(),
            });
        }
    }

    return results;
}

// ─── Format for V-Prai context injection ─────────────
export function formatScrapeForContext(scrapeResults: SmartScrapeResult[]): string {
    if (!scrapeResults.length) return '';

    let context = '## SMART SCRAPE RESEARCH RESULTS\n\n';

    for (const result of scrapeResults) {
        context += `### ${result.platform.toUpperCase()} — "${result.query}" (${result.totalFound} found)\n\n`;

        for (const item of result.results.slice(0, 5)) {
            context += `**${item.title}**\n`;
            context += `- Author: ${item.author} (${item.authorFollowers?.toLocaleString() || '?'} followers)\n`;
            context += `- Views: ${item.views.toLocaleString()} | Likes: ${item.likes.toLocaleString()} | Comments: ${item.comments.toLocaleString()}\n`;
            if (item.engagementRate) context += `- Engagement Rate: ${item.engagementRate.toFixed(2)}%\n`;
            if (item.transcript) context += `- Transcript: ${item.transcript.slice(0, 500)}...\n`;
            if (item.topComments?.length) {
                context += `- Top Comments:\n`;
                item.topComments.slice(0, 3).forEach(c => {
                    context += `  - "${c.slice(0, 150)}"\n`;
                });
            }
            context += `- URL: ${item.url}\n\n`;
        }
    }

    return context;
}
