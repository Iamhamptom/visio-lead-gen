/**
 * Visio Web Scraper
 * 
 * Cheerio-based contact extraction from web pages.
 * Extracts emails, social links, names, and titles from HTML.
 * Works on Vercel (no headless browser needed).
 */

import * as cheerio from 'cheerio';

// ─── SSRF Protection ─────────────────────────────────────
/**
 * Validates a URL to prevent SSRF attacks. Blocks internal/private IPs,
 * cloud metadata endpoints, and non-HTTP(S) schemes.
 */
function isUrlSafeForSsrf(urlStr: string): boolean {
    try {
        const url = new URL(urlStr);

        // Only allow http and https schemes
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return false;
        }

        const hostname = url.hostname.toLowerCase();

        // Block localhost variants
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]' || hostname === '0.0.0.0') {
            return false;
        }

        // Block private IP ranges and cloud metadata
        const blockedPatterns = [
            /^10\./,                          // 10.0.0.0/8
            /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
            /^192\.168\./,                     // 192.168.0.0/16
            /^169\.254\./,                     // Link-local / AWS metadata
            /^100\.(6[4-9]|[7-9][0-9]|1[0-2][0-7])\./,  // Carrier-grade NAT
            /^fc00:/i,                         // IPv6 unique local
            /^fe80:/i,                         // IPv6 link-local
            /^fd/i,                            // IPv6 private
        ];

        for (const pattern of blockedPatterns) {
            if (pattern.test(hostname)) {
                return false;
            }
        }

        // Block cloud metadata hostnames
        const blockedHosts = [
            'metadata.google.internal',
            'metadata.google',
            'metadata',
        ];
        if (blockedHosts.includes(hostname)) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

// ─── Types ─────────────────────────────────────────────
export interface ScrapedContact {
    name?: string;
    email?: string;
    title?: string;
    company?: string;
    url?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    linkedin?: string;
    youtube?: string;
    soundcloud?: string;
    phone?: string;
    source: string;
}

export interface ScrapeResult {
    contacts: ScrapedContact[];
    emails: string[];
    socialLinks: SocialLinks;
    rawText: string;
    success: boolean;
    error?: string;
}

export interface SocialLinks {
    instagram: string[];
    twitter: string[];
    tiktok: string[];
    linkedin: string[];
    youtube: string[];
    soundcloud: string[];
    facebook: string[];
    spotify: string[];
}

// ─── Email Extraction ──────────────────────────────────
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

/** Emails to exclude (common false positives) */
const EMAIL_BLACKLIST = [
    'example.com', 'test.com', 'domain.com', 'email.com',
    'yourname@', 'name@', 'user@', 'info@example',
    '.png', '.jpg', '.gif', '.svg', '.css', '.js'
];

export function extractEmailsFromText(text: string): string[] {
    const matches = text.match(EMAIL_REGEX) || [];
    return [...new Set(matches)].filter(email => {
        const lower = email.toLowerCase();
        return !EMAIL_BLACKLIST.some(bl => lower.includes(bl));
    });
}

// ─── Social Link Extraction ───────────────────────────
// Excluded path segments for platforms where common non-profile URLs match
const TWITTER_EXCLUDED_PATHS = new Set(['home', 'explore', 'search', 'notifications', 'messages', 'settings', 'i', 'intent', 'hashtag', 'share', 'login', 'signup']);

const SOCIAL_PATTERNS: Record<keyof SocialLinks, RegExp> = {
    instagram: /https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+/g,
    twitter: /https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+/g,
    tiktok: /https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+/g,
    linkedin: /https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9\-]+/g,
    youtube: /https?:\/\/(www\.)?youtube\.com\/(@[a-zA-Z0-9\-_]+|(channel|c)\/[a-zA-Z0-9\-_]+)/g,
    soundcloud: /https?:\/\/(www\.)?soundcloud\.com\/[a-zA-Z0-9\-]+/g,
    facebook: /https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.\-]+/g,
    spotify: /https?:\/\/open\.spotify\.com\/(artist|user)\/[a-zA-Z0-9]+/g,
};

export function extractSocialLinks(text: string): SocialLinks {
    const links: SocialLinks = {
        instagram: [], twitter: [], tiktok: [], linkedin: [],
        youtube: [], soundcloud: [], facebook: [], spotify: []
    };

    for (const [platform, regex] of Object.entries(SOCIAL_PATTERNS) as [keyof SocialLinks, RegExp][]) {
        const found = text.match(regex) ?? [];
        let matches: string[] = Array.from(found);
        // Filter out common non-profile Twitter/X paths
        if (platform === 'twitter') {
            matches = matches.filter(url => {
                try {
                    const path = new URL(url).pathname.split('/')[1]?.toLowerCase();
                    return path && !TWITTER_EXCLUDED_PATHS.has(path);
                } catch { return true; }
            });
        }
        links[platform] = [...new Set(matches)];
    }

    return links;
}

// ─── Phone Number Extraction ──────────────────────────
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;

export function extractPhoneNumbers(text: string): string[] {
    const matches = text.match(PHONE_REGEX) || [];
    return [...new Set(matches)].filter(p => p.replace(/\D/g, '').length >= 8);
}

// ─── Main Scraper ─────────────────────────────────────
/**
 * Fetch and scrape a URL for contact information.
 * Uses cheerio (no headless browser) — works on Vercel.
 */
export async function scrapeContactsFromUrl(url: string): Promise<ScrapeResult> {
    try {
        if (!isUrlSafeForSsrf(url)) {
            return { contacts: [], emails: [], socialLinks: emptySocialLinks(), rawText: '', success: false, error: 'URL blocked: private/internal addresses are not allowed' };
        }

        console.log(`[Scraper] Scraping ${url}...`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            return { contacts: [], emails: [], socialLinks: emptySocialLinks(), rawText: '', success: false, error: `HTTP ${response.status}` };
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove scripts, styles to focus on content
        $('script, style, noscript, iframe').remove();

        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
        const fullHtml = $.html();

        // Extract data
        const emails = extractEmailsFromText(bodyText + ' ' + fullHtml);
        const socialLinks = extractSocialLinks(fullHtml);
        const phones = extractPhoneNumbers(bodyText);

        // Build contacts from structured data
        const contacts: ScrapedContact[] = [];

        // Look for structured contact elements
        $('[itemtype*="Person"], .team-member, .staff, .contact-card, .author, [class*="team"], [class*="author"]').each((_, el) => {
            const name = $(el).find('[itemprop="name"], h2, h3, h4, .name').first().text().trim();
            const title = $(el).find('[itemprop="jobTitle"], .title, .position, .role').first().text().trim();
            const email = $(el).find('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '') || '';

            if (name && name.length > 2 && name.length < 100) {
                contacts.push({
                    name,
                    title: title || undefined,
                    email: email || undefined,
                    url,
                    source: `Scraped from ${new URL(url).hostname}`
                });
            }
        });

        // Look for mailto links
        $('a[href^="mailto:"]').each((_, el) => {
            const email = $(el).attr('href')?.replace('mailto:', '').split('?')[0];
            const name = $(el).text().trim();
            if (email && !EMAIL_BLACKLIST.some(bl => email.toLowerCase().includes(bl))) {
                if (!contacts.some(c => c.email === email)) {
                    contacts.push({
                        name: name !== email ? name : undefined,
                        email,
                        url,
                        source: `Scraped from ${new URL(url).hostname}`
                    });
                }
            }
        });

        // Add phone numbers to first contact
        if (phones.length > 0 && contacts.length > 0) {
            contacts[0].phone = phones[0];
        }

        // Add social links to contacts
        for (const contact of contacts) {
            if (socialLinks.instagram.length > 0) contact.instagram = socialLinks.instagram[0];
            if (socialLinks.twitter.length > 0) contact.twitter = socialLinks.twitter[0];
            if (socialLinks.tiktok.length > 0) contact.tiktok = socialLinks.tiktok[0];
            if (socialLinks.linkedin.length > 0) contact.linkedin = socialLinks.linkedin[0];
        }

        console.log(`[Scraper] Found: ${emails.length} emails, ${contacts.length} contacts, ${Object.values(socialLinks).flat().length} social links`);

        return { contacts, emails, socialLinks, rawText: bodyText.slice(0, 2000), success: true };

    } catch (error: any) {
        console.error('[Scraper] Failed:', error.message);
        return { contacts: [], emails: [], socialLinks: emptySocialLinks(), rawText: '', success: false, error: error.message };
    }
}

/**
 * Scrape multiple URLs in parallel and merge results.
 */
export async function scrapeMultipleUrls(urls: string[], maxConcurrent: number = 3): Promise<ScrapeResult> {
    const chunks: string[][] = [];
    for (let i = 0; i < urls.length; i += maxConcurrent) {
        chunks.push(urls.slice(i, i + maxConcurrent));
    }

    const allContacts: ScrapedContact[] = [];
    const allEmails: string[] = [];
    const allSocial: SocialLinks = emptySocialLinks();

    for (const chunk of chunks) {
        const results = await Promise.allSettled(chunk.map(url => scrapeContactsFromUrl(url)));
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.success) {
                allContacts.push(...result.value.contacts);
                allEmails.push(...result.value.emails);
                for (const [platform, links] of Object.entries(result.value.socialLinks)) {
                    (allSocial as any)[platform].push(...links);
                }
            }
        }
    }

    // Deduplicate
    const uniqueEmails = [...new Set(allEmails)];
    for (const platform of Object.keys(allSocial)) {
        (allSocial as any)[platform] = [...new Set((allSocial as any)[platform])];
    }

    return { contacts: allContacts, emails: uniqueEmails, socialLinks: allSocial, rawText: '', success: true };
}

function emptySocialLinks(): SocialLinks {
    return {
        instagram: [], twitter: [], tiktok: [], linkedin: [],
        youtube: [], soundcloud: [], facebook: [], spotify: []
    };
}
