/**
 * Visio Cascading Lead Search Pipeline
 *
 * Smart automation engine that starts cheap (local DB + Google),
 * then escalates to Apify scrapers only if insufficient results.
 *
 * Tier 1: Local DB + Google Search + Social Search (free / low cost)
 * Tier 2: Apollo + Web Scraping (medium cost)
 * Tier 3: Deep Search across all pipelines (highest cost)
 */

import { getLeadsByCountry, DBLead } from '@/lib/db';
import { performLeadSearch, SearchResult } from '@/lib/search';
import { searchAllSocials, flattenSocialResults, SocialProfile } from '@/lib/social-search';
import { searchApollo, performDeepSearch } from '@/lib/pipelines';
import { scrapeMultipleUrls, ScrapedContact } from '@/lib/scraper';

// ─── Interfaces ─────────────────────────────────────────

export interface PipelineBrief {
    contactTypes: string[];
    markets: string[];
    genre?: string;
    query: string;
    targetCount: number;
    searchDepth: 'quick' | 'deep' | 'full';
    /** Preferred social platform to focus on (e.g., 'tiktok', 'instagram') */
    preferredPlatform?: string;
    /** Specific location more granular than country (e.g., 'Soweto', 'Cape Town') */
    specificLocation?: string;
}

export interface PipelineProgress {
    tier: string;
    status: 'searching' | 'enriching' | 'done';
    found: number;
    target: number;
    currentSource: string;
    logs: string[];
}

export interface PipelineContact {
    name: string;
    email?: string;
    company?: string;
    title?: string;
    source: string;
    url?: string;
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    linkedin?: string;
    followers?: string;
    country?: string;
    confidence: string;
}

// ─── Country Normalization ──────────────────────────────

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
    'south africa': 'ZA',
    'nigeria': 'NG',
    'ghana': 'GH',
    'kenya': 'KE',
    'united kingdom': 'UK',
    'uk': 'UK',
    'united states': 'USA',
    'usa': 'USA',
    'us': 'USA',
    'germany': 'DE',
    'france': 'FR',
    'australia': 'AU',
    'canada': 'CA',
    'japan': 'JP',
    'brazil': 'BR',
    'tanzania': 'TZ',
    'uganda': 'UG',
    'egypt': 'EG',
    'morocco': 'MA',
    'india': 'IN',
    'netherlands': 'NL',
    'sweden': 'SE',
    'italy': 'IT',
    'spain': 'ES',
    'portugal': 'PT',
    'mexico': 'MX',
    'colombia': 'CO',
    'argentina': 'AR',
    'chile': 'CL',
    'new zealand': 'NZ',
    'ireland': 'IE',
    'jamaica': 'JM',
    'trinidad and tobago': 'TT',
};

function normalizeCountry(market: string): string {
    const lower = market.toLowerCase().trim();
    return COUNTRY_NAME_TO_CODE[lower] || market.toUpperCase().slice(0, 2);
}

// ─── Query Builder ──────────────────────────────────────

function buildSearchQuery(brief: PipelineBrief): string {
    const parts: string[] = [];

    // Add genre if provided (e.g. "amapiano", "hip-hop")
    if (brief.genre) {
        parts.push(brief.genre);
    }

    // Add contact types (e.g. "playlist curators", "bloggers", "A&R")
    if (brief.contactTypes.length > 0) {
        parts.push(brief.contactTypes.join(' '));
    }

    // Add specific location before market-level location for precision
    // e.g., "Soweto" before "South Africa"
    if (brief.specificLocation) {
        parts.push(brief.specificLocation);
    }

    // Add markets as location context
    if (brief.markets.length > 0) {
        parts.push(brief.markets.join(' '));
    }

    // Add contact-finding keywords
    parts.push('email contact');

    // Combine and clean up
    const query = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

    // If user also provided a freeform query, prepend it
    if (brief.query && brief.query.trim()) {
        const briefQuery = brief.query.trim();
        // Avoid duplication if the query is already part of the built string
        if (!query.toLowerCase().includes(briefQuery.toLowerCase())) {
            return `${briefQuery} ${query}`;
        }
    }

    return query;
}

// ─── Deduplication ──────────────────────────────────────

function deduplicateContacts(contacts: PipelineContact[]): PipelineContact[] {
    const seen = new Map<string, PipelineContact>();

    for (const contact of contacts) {
        const normalizedName = (contact.name || '').toLowerCase().trim();
        const normalizedEmail = (contact.email || '').toLowerCase().trim();

        // Build a dedup key from name + email
        // If both are empty, skip
        if (!normalizedName && !normalizedEmail) continue;

        const key = `${normalizedName}||${normalizedEmail}`;

        const existing = seen.get(key);
        if (!existing) {
            seen.set(key, { ...contact });
        } else {
            // Merge: fill in missing fields from the new contact
            const merged = { ...existing };
            if (!merged.email && contact.email) merged.email = contact.email;
            if (!merged.company && contact.company) merged.company = contact.company;
            if (!merged.title && contact.title) merged.title = contact.title;
            if (!merged.url && contact.url) merged.url = contact.url;
            if (!merged.instagram && contact.instagram) merged.instagram = contact.instagram;
            if (!merged.tiktok && contact.tiktok) merged.tiktok = contact.tiktok;
            if (!merged.twitter && contact.twitter) merged.twitter = contact.twitter;
            if (!merged.linkedin && contact.linkedin) merged.linkedin = contact.linkedin;
            if (!merged.followers && contact.followers) merged.followers = contact.followers;
            if (!merged.country && contact.country) merged.country = contact.country;

            // Upgrade confidence if the newer contact has higher confidence
            const confidenceRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
            const existingRank = confidenceRank[merged.confidence] || 0;
            const newRank = confidenceRank[contact.confidence] || 0;
            if (newRank > existingRank) {
                merged.confidence = contact.confidence;
            }

            seen.set(key, merged);
        }
    }

    return [...seen.values()];
}

// ─── Source Mappers ─────────────────────────────────────

function mapDBLeadToContact(lead: DBLead, countryCode: string): PipelineContact {
    return {
        name: lead.person || lead.company,
        email: lead.email || undefined,
        company: lead.company || undefined,
        title: lead.title || undefined,
        source: `Local DB (${countryCode})`,
        url: undefined,
        instagram: lead.instagram || undefined,
        tiktok: lead.tiktok || undefined,
        twitter: lead.twitter || undefined,
        linkedin: undefined,
        followers: lead.followers || undefined,
        country: countryCode,
        confidence: lead.email ? 'high' : 'medium',
    };
}

function mapSearchResultToContact(result: SearchResult): PipelineContact | null {
    const name = (result.name || '').trim();

    // Skip results that are clearly article/page titles, not people or organizations
    // These patterns indicate a web page title, not a contact name
    if (!name) return null;
    if (name.length > 80) return null; // Article titles tend to be very long

    const articlePatterns = [
        /^(experience|discover|explore|learn|how to|the best|top \d+|best \d+|\d+ best|\d+ top|a guide|guide to|everything you|why you|what you|welcome to|introducing)/i,
        /\b(tips for|ways to|things to|reasons to|steps to|click here|subscribe|sign up|download|privacy policy|terms of|cookie|loading)\b/i,
    ];
    if (articlePatterns.some(p => p.test(name))) return null;

    return {
        name,
        email: undefined,
        company: result.company || undefined,
        title: result.title || undefined,
        source: result.source || 'Google Search',
        url: result.url,
        confidence: 'low',
    };
}

function mapSocialProfileToContact(profile: SocialProfile): PipelineContact {
    const contact: PipelineContact = {
        name: profile.name,
        source: profile.source,
        url: profile.url,
        confidence: 'medium',
    };

    // Map platform-specific URLs to the right field
    switch (profile.platform) {
        case 'instagram':
            contact.instagram = profile.handle || profile.url;
            break;
        case 'tiktok':
            contact.tiktok = profile.handle || profile.url;
            break;
        case 'twitter':
            contact.twitter = profile.handle || profile.url;
            break;
        case 'linkedin':
            contact.linkedin = profile.url;
            break;
    }

    return contact;
}

function mapScrapedContactToContact(scraped: ScrapedContact): PipelineContact {
    return {
        name: scraped.name || 'Unknown',
        email: scraped.email || undefined,
        company: scraped.company || undefined,
        title: scraped.title || undefined,
        source: scraped.source,
        url: scraped.url || undefined,
        instagram: scraped.instagram || undefined,
        tiktok: scraped.tiktok || undefined,
        twitter: scraped.twitter || undefined,
        linkedin: scraped.linkedin || undefined,
        confidence: scraped.email ? 'medium' : 'low',
    };
}

// ─── Main Pipeline ──────────────────────────────────────

export async function performCascadingSearch(
    brief: PipelineBrief,
    onProgress?: (progress: PipelineProgress) => void
): Promise<{ contacts: PipelineContact[]; logs: string[]; total: number }> {
    const logs: string[] = [];
    let allContacts: PipelineContact[] = [];

    const searchQuery = buildSearchQuery(brief);
    const countryCodes = brief.markets.map(normalizeCountry);
    // Use first market as primary country for search APIs, default to ZA
    const primaryCountry = countryCodes[0] || 'ZA';

    logs.push(`[Pipeline] Starting cascading search: depth=${brief.searchDepth}, target=${brief.targetCount}`);
    logs.push(`[Pipeline] Search query: "${searchQuery}"`);
    logs.push(`[Pipeline] Markets: ${brief.markets.join(', ')} -> Country codes: ${countryCodes.join(', ')}`);

    // ═══════════════════════════════════════════════════
    // TIER 1: Local DB + Google Search + Social Search
    // ═══════════════════════════════════════════════════

    const emitProgress = (tier: string, status: PipelineProgress['status'], currentSource: string) => {
        if (onProgress) {
            onProgress({
                tier,
                status,
                found: allContacts.length,
                target: brief.targetCount,
                currentSource,
                logs: [...logs],
            });
        }
    };

    logs.push('[Pipeline] === TIER 1: Local DB + Google + Social ===');
    emitProgress('Tier 1', 'searching', 'Local Database');

    // --- 1a: Local Database ---
    try {
        const dbContacts: PipelineContact[] = [];

        for (const code of countryCodes) {
            const dbLeads = getLeadsByCountry(code);
            logs.push(`[Tier 1] Local DB (${code}): ${dbLeads.length} leads found`);

            // Filter DB leads by query relevance (contact types, genre)
            const queryTerms = [
                ...brief.contactTypes,
                ...(brief.genre ? [brief.genre] : []),
            ].map(t => t.toLowerCase());

            const filtered = dbLeads.filter(lead => {
                if (queryTerms.length === 0) return true;
                const haystack = [
                    lead.person, lead.company, lead.title, lead.industry,
                ].filter(Boolean).join(' ').toLowerCase();
                return queryTerms.some(term => haystack.includes(term));
            });

            logs.push(`[Tier 1] Local DB (${code}): ${filtered.length} leads after filtering`);
            dbContacts.push(...filtered.map(lead => mapDBLeadToContact(lead, code)));
        }

        allContacts.push(...dbContacts);
    } catch (error: any) {
        logs.push(`[Tier 1] Local DB error: ${error.message} — continuing`);
    }

    emitProgress('Tier 1', 'searching', 'Google Search');

    // --- 1b: Google Lead Search ---
    try {
        const searchResults = await performLeadSearch(searchQuery, primaryCountry);
        logs.push(`[Tier 1] Google Lead Search: ${searchResults.length} results`);

        const googleContacts = searchResults.map(mapSearchResultToContact).filter((c): c is PipelineContact => c !== null);
        allContacts.push(...googleContacts);
    } catch (error: any) {
        logs.push(`[Tier 1] Google Lead Search error: ${error.message} — continuing`);
    }

    emitProgress('Tier 1', 'searching', 'Social Media Search');

    // --- 1c: Social Media Search ---
    try {
        // Build social query with location context if available
        const socialQueryParts = [...brief.contactTypes];
        if (brief.genre) socialQueryParts.unshift(brief.genre);
        if (brief.specificLocation) socialQueryParts.push(brief.specificLocation);
        const socialQuery = socialQueryParts.filter(Boolean).join(' ');

        // If user specified a platform, focus search on that platform
        // Otherwise search all default platforms
        type SocialPlatformType = 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'linkedin' | 'soundcloud' | 'spotify';
        const platformMap: Record<string, SocialPlatformType[]> = {
            'tiktok': ['tiktok'],
            'instagram': ['instagram'],
            'twitter': ['twitter'],
            'youtube': ['youtube'],
            'linkedin': ['linkedin'],
        };
        const platforms = brief.preferredPlatform
            ? platformMap[brief.preferredPlatform.toLowerCase()] || ['instagram', 'tiktok', 'twitter', 'linkedin']
            : ['instagram', 'tiktok', 'twitter', 'linkedin'];

        logs.push(`[Tier 1] Social Search: querying ${platforms.join(', ')} for "${socialQuery || searchQuery}"`);

        const socialResults = await searchAllSocials(
            socialQuery || searchQuery,
            primaryCountry,
            platforms as any
        );
        const flatSocials = flattenSocialResults(socialResults);
        logs.push(`[Tier 1] Social Search: ${flatSocials.length} profiles found`);

        const socialContacts = flatSocials.map(mapSocialProfileToContact);
        allContacts.push(...socialContacts);
    } catch (error: any) {
        logs.push(`[Tier 1] Social Search error: ${error.message} — continuing`);
    }

    // Deduplicate after Tier 1
    allContacts = deduplicateContacts(allContacts);
    logs.push(`[Tier 1] After dedup: ${allContacts.length} unique contacts`);

    emitProgress('Tier 1', 'done', 'Tier 1 Complete');

    // Check if we have enough or depth is 'quick'
    if (allContacts.length >= brief.targetCount || brief.searchDepth === 'quick') {
        logs.push(`[Pipeline] Stopping at Tier 1: ${allContacts.length} contacts found (target: ${brief.targetCount}, depth: ${brief.searchDepth})`);
        emitProgress('Tier 1', 'done', 'Complete');
        return {
            contacts: allContacts.slice(0, brief.targetCount),
            logs,
            total: allContacts.length,
        };
    }

    // ═══════════════════════════════════════════════════
    // TIER 2: Apollo + Web Scraping
    // ═══════════════════════════════════════════════════

    logs.push('[Pipeline] === TIER 2: Apollo + Web Scraping ===');
    emitProgress('Tier 2', 'searching', 'Apollo Search');

    // --- 2a: Apollo ---
    try {
        const apolloResult = await searchApollo(searchQuery, primaryCountry);
        logs.push(...apolloResult.logs);
        logs.push(`[Tier 2] Apollo: ${apolloResult.contacts.length} contacts`);

        const apolloContacts: PipelineContact[] = apolloResult.contacts.map(c => ({
            name: c.name,
            email: c.email || undefined,
            company: c.company || undefined,
            title: c.title || undefined,
            source: c.source,
            url: c.url || undefined,
            instagram: c.instagram || undefined,
            tiktok: c.tiktok || undefined,
            twitter: c.twitter || undefined,
            linkedin: c.linkedin || undefined,
            followers: c.followers || undefined,
            country: primaryCountry,
            confidence: c.confidence,
        }));

        allContacts.push(...apolloContacts);
    } catch (error: any) {
        logs.push(`[Tier 2] Apollo error: ${error.message} — continuing`);
    }

    emitProgress('Tier 2', 'enriching', 'Web Scraping');

    // --- 2b: Scrape URLs from Tier 1 search results for emails ---
    try {
        const urlsToScrape = allContacts
            .filter(c => c.url && !c.email)
            .map(c => c.url!)
            .slice(0, 10);

        if (urlsToScrape.length > 0) {
            logs.push(`[Tier 2] Scraping ${urlsToScrape.length} URLs for additional contacts...`);
            const scrapeResult = await scrapeMultipleUrls(urlsToScrape, 3);

            if (scrapeResult.success && scrapeResult.contacts.length > 0) {
                const scrapedContacts = scrapeResult.contacts.map(mapScrapedContactToContact);
                logs.push(`[Tier 2] Web Scraping: ${scrapedContacts.length} contacts extracted`);
                allContacts.push(...scrapedContacts);
            } else {
                logs.push(`[Tier 2] Web Scraping: no additional contacts found`);
            }
        } else {
            logs.push(`[Tier 2] Web Scraping: no URLs to scrape`);
        }
    } catch (error: any) {
        logs.push(`[Tier 2] Web Scraping error: ${error.message} — continuing`);
    }

    // Deduplicate after Tier 2
    allContacts = deduplicateContacts(allContacts);
    logs.push(`[Tier 2] After dedup: ${allContacts.length} unique contacts`);

    emitProgress('Tier 2', 'done', 'Tier 2 Complete');

    // Check if we have enough or depth is 'deep'
    if (allContacts.length >= brief.targetCount || brief.searchDepth === 'deep') {
        logs.push(`[Pipeline] Stopping at Tier 2: ${allContacts.length} contacts found (target: ${brief.targetCount}, depth: ${brief.searchDepth})`);
        emitProgress('Tier 2', 'done', 'Complete');
        return {
            contacts: allContacts.slice(0, brief.targetCount),
            logs,
            total: allContacts.length,
        };
    }

    // ═══════════════════════════════════════════════════
    // TIER 3: Deep Search (all pipelines)
    // ═══════════════════════════════════════════════════

    logs.push('[Pipeline] === TIER 3: Deep Search (Full) ===');
    emitProgress('Tier 3', 'searching', 'Deep Search (All Pipelines)');

    try {
        const deepResult = await performDeepSearch(searchQuery, primaryCountry);
        logs.push(...deepResult.logs);
        logs.push(`[Tier 3] Deep Search: ${deepResult.contacts.length} contacts from ${deepResult.apisUsed.length} APIs`);

        const deepContacts: PipelineContact[] = deepResult.contacts.map(c => ({
            name: c.name,
            email: c.email || undefined,
            company: c.company || undefined,
            title: c.title || undefined,
            source: c.source,
            url: c.url || undefined,
            instagram: c.instagram || undefined,
            tiktok: c.tiktok || undefined,
            twitter: c.twitter || undefined,
            linkedin: c.linkedin || undefined,
            followers: c.followers || undefined,
            country: primaryCountry,
            confidence: c.confidence,
        }));

        allContacts.push(...deepContacts);
    } catch (error: any) {
        logs.push(`[Tier 3] Deep Search error: ${error.message} — continuing`);
    }

    // Final deduplication
    allContacts = deduplicateContacts(allContacts);
    logs.push(`[Tier 3] After final dedup: ${allContacts.length} unique contacts`);

    // Sort by confidence: high > medium > low
    const confidenceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    allContacts.sort((a, b) => {
        const aRank = confidenceOrder[a.confidence] ?? 3;
        const bRank = confidenceOrder[b.confidence] ?? 3;
        return aRank - bRank;
    });

    logs.push(`[Pipeline] Complete: ${allContacts.length} total contacts found (target was ${brief.targetCount})`);
    emitProgress('Tier 3', 'done', 'Complete');

    return {
        contacts: allContacts,
        logs,
        total: allContacts.length,
    };
}
