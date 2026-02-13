/**
 * Visio Lead Generation Pipelines
 * 
 * "Pay-to-Unlock" architecture:
 * Each pipeline checks for its API key → uses official API if available,
 * falls back to Google Search + Cheerio scraping if not.
 * 
 * Supported Pipelines:
 * - Apollo.io (people/company search, email finder)
 * - LinkedIn (profile search, company lookup)
 * - ZoomInfo (contact database, org charts)
 * - PhantomBuster (social scraping, automation)
 * 
 * ENV VARS:
 * - APOLLO_API_KEY
 * - LINKEDIN_API_KEY  
 * - ZOOMINFO_API_KEY
 * - PHANTOMBUSTER_API_KEY
 */

import { performGoogleSearch } from './serper';
import { scrapeContactsFromUrl, ScrapedContact } from './scraper';
import { searchLinkedIn, searchInstagram, searchTikTok, SocialProfile } from './social-search';

// ─── Types ─────────────────────────────────────────────
export interface PipelineResult {
    contacts: PipelineContact[];
    source: string;
    apiUsed: boolean;
    logs: string[];
    total: number;
}

export interface PipelineContact {
    name: string;
    email?: string;
    title?: string;
    company?: string;
    url?: string;
    phone?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    followers?: string;
    source: string;
    confidence: 'high' | 'medium' | 'low';
}

// ─── Pipeline Status ───────────────────────────────────
export interface PipelineStatus {
    apollo: boolean;
    linkedin: boolean;
    zoominfo: boolean;
    phantombuster: boolean;
}

export function getPipelineStatus(): PipelineStatus {
    return {
        apollo: !!process.env.APOLLO_API_KEY,
        linkedin: !!process.env.LINKEDIN_API_KEY,
        zoominfo: !!process.env.ZOOMINFO_API_KEY,
        phantombuster: !!process.env.PHANTOMBUSTER_API_KEY,
    };
}

// ═══════════════════════════════════════════════════════
// APOLLO.IO PIPELINE
// ═══════════════════════════════════════════════════════

export async function searchApollo(query: string, country: string = 'ZA'): Promise<PipelineResult> {
    const apiKey = process.env.APOLLO_API_KEY;
    const logs: string[] = [];

    // ─── Official API Path ─────────────────────────
    if (apiKey) {
        logs.push('[Apollo] 🔑 API key detected — using official Apollo.io API');
        try {
            const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'X-Api-Key': apiKey
                },
                body: JSON.stringify({
                    q_keywords: query,
                    person_locations: [country === 'ZA' ? 'South Africa' : country],
                    person_titles: ['curator', 'journalist', 'blogger', 'DJ', 'A&R', 'PR', 'publicist', 'editor', 'manager'],
                    per_page: 25
                })
            });

            if (!response.ok) {
                throw new Error(`Apollo API returned ${response.status}`);
            }

            const data = await response.json();
            const contacts: PipelineContact[] = (data.people || []).map((person: any) => ({
                name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
                email: person.email,
                title: person.title,
                company: person.organization?.name,
                linkedin: person.linkedin_url,
                url: person.linkedin_url,
                source: 'Apollo.io (API)',
                confidence: person.email_status === 'verified' ? 'high' as const : 'medium' as const
            }));

            logs.push(`[Apollo] ✅ Found ${contacts.length} contacts via API`);
            return { contacts, source: 'Apollo.io (API)', apiUsed: true, logs, total: contacts.length };

        } catch (error: any) {
            logs.push(`[Apollo] ❌ API error: ${error.message} — falling back to Google`);
        }
    } else {
        logs.push('[Apollo] ⚪ No API key — using Google Search fallback');
    }

    // ─── Google Fallback ───────────────────────────
    const fallbackResults = await performGoogleSearch(query + ' music industry contacts email', country);

    const contacts: PipelineContact[] = [];
    const urlsToScrape: string[] = [];

    for (const result of fallbackResults.slice(0, 5)) {
        contacts.push({
            name: result.title.split(' | ')[0].split(' - ')[0].trim(),
            url: result.link,
            company: result.title.includes(' | ') ? result.title.split(' | ').pop()?.trim() : undefined,
            source: 'Apollo Fallback (Google)',
            confidence: 'low'
        });
        urlsToScrape.push(result.link);
    }

    // Scrape top results for emails
    for (const url of urlsToScrape.slice(0, 3)) {
        try {
            const scrapeResult = await scrapeContactsFromUrl(url);
            if (scrapeResult.success && scrapeResult.emails.length > 0) {
                const matchingContact = contacts.find(c => c.url === url);
                if (matchingContact) {
                    matchingContact.email = scrapeResult.emails[0];
                    matchingContact.confidence = 'medium';
                }
            }
        } catch { /* skip failed scrapes */ }
    }

    logs.push(`[Apollo] ✅ Found ${contacts.length} contacts via Google fallback`);
    return { contacts, source: 'Apollo Fallback (Google + Scrape)', apiUsed: false, logs, total: contacts.length };
}

// ═══════════════════════════════════════════════════════
// LINKEDIN PIPELINE
// ═══════════════════════════════════════════════════════

export async function searchLinkedInPipeline(query: string, country: string = 'ZA'): Promise<PipelineResult> {
    const apiKey = process.env.LINKEDIN_API_KEY;
    const logs: string[] = [];

    // ─── Official API Path ─────────────────────────
    if (apiKey) {
        logs.push('[LinkedIn] 🔑 API key detected — using LinkedIn API');
        try {
            // LinkedIn's People Search API (requires LinkedIn Recruiter or Sales Navigator)
            const response = await fetch('https://api.linkedin.com/v2/search/people', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });

            if (!response.ok) {
                throw new Error(`LinkedIn API returned ${response.status}`);
            }

            const data = await response.json();
            const contacts: PipelineContact[] = (data.elements || []).map((person: any) => ({
                name: `${person.firstName || ''} ${person.lastName || ''}`.trim(),
                title: person.headline,
                company: person.companyName,
                linkedin: `https://www.linkedin.com/in/${person.vanityName || ''}`,
                url: `https://www.linkedin.com/in/${person.vanityName || ''}`,
                source: 'LinkedIn (API)',
                confidence: 'high' as const
            }));

            logs.push(`[LinkedIn] ✅ Found ${contacts.length} profiles via API`);
            return { contacts, source: 'LinkedIn (API)', apiUsed: true, logs, total: contacts.length };
        } catch (error: any) {
            logs.push(`[LinkedIn] ❌ API error: ${error.message} — falling back to Google`);
        }
    } else {
        logs.push('[LinkedIn] ⚪ No API key — using Google site: search');
    }

    // ─── Google Fallback ───────────────────────────
    const profiles = await searchLinkedIn(query, country);

    const contacts: PipelineContact[] = profiles.map(p => ({
        name: p.name,
        linkedin: p.url,
        url: p.url,
        title: p.bio?.slice(0, 100),
        source: 'LinkedIn (Google site: search)',
        confidence: 'medium' as const
    }));

    logs.push(`[LinkedIn] ✅ Found ${contacts.length} profiles via Google`);
    return { contacts, source: 'LinkedIn (Google Fallback)', apiUsed: false, logs, total: contacts.length };
}

// ═══════════════════════════════════════════════════════
// ZOOMINFO PIPELINE
// ═══════════════════════════════════════════════════════

export async function searchZoomInfo(query: string, country: string = 'ZA'): Promise<PipelineResult> {
    const apiKey = process.env.ZOOMINFO_API_KEY;
    const logs: string[] = [];

    // ─── Official API Path ─────────────────────────
    if (apiKey) {
        logs.push('[ZoomInfo] 🔑 API key detected — using ZoomInfo API');
        try {
            // ZoomInfo uses a JWT token-based auth flow
            const tokenResponse = await fetch('https://api.zoominfo.com/authenticate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: '', password: '', apiKey })
            });

            if (!tokenResponse.ok) throw new Error('Auth failed');
            const { jwt } = await tokenResponse.json();

            const searchResponse = await fetch('https://api.zoominfo.com/search/contact', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    searchType: 'contact',
                    rpp: 25,
                    keyword: query,
                    companyIndustry: ['Music', 'Entertainment', 'Media', 'Publishing'],
                    countryCode: country
                })
            });

            if (!searchResponse.ok) throw new Error(`Search API returned ${searchResponse.status}`);
            const data = await searchResponse.json();

            const contacts: PipelineContact[] = (data.data || []).map((c: any) => ({
                name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                email: c.email,
                title: c.jobTitle,
                company: c.companyName,
                phone: c.phone,
                linkedin: c.linkedinUrl,
                url: c.linkedinUrl,
                source: 'ZoomInfo (API)',
                confidence: 'high' as const
            }));

            logs.push(`[ZoomInfo] ✅ Found ${contacts.length} contacts via API`);
            return { contacts, source: 'ZoomInfo (API)', apiUsed: true, logs, total: contacts.length };
        } catch (error: any) {
            logs.push(`[ZoomInfo] ❌ API error: ${error.message} — falling back to Google`);
        }
    } else {
        logs.push('[ZoomInfo] ⚪ No API key — using Google Search fallback');
    }

    // ─── Google Fallback ───────────────────────────
    const googleResults = await performGoogleSearch(
        `${query} music entertainment ${country === 'ZA' ? 'South Africa' : country} contact email`,
        country
    );

    const contacts: PipelineContact[] = googleResults.slice(0, 10).map(r => ({
        name: r.title.split(' | ')[0].split(' - ')[0].trim(),
        url: r.link,
        source: 'ZoomInfo Fallback (Google)',
        confidence: 'low' as const
    }));

    logs.push(`[ZoomInfo] ✅ Found ${contacts.length} results via Google fallback`);
    return { contacts, source: 'ZoomInfo Fallback (Google)', apiUsed: false, logs, total: contacts.length };
}

// ═══════════════════════════════════════════════════════
// PHANTOMBUSTER PIPELINE
// ═══════════════════════════════════════════════════════

export async function searchPhantomBuster(query: string, country: string = 'ZA'): Promise<PipelineResult> {
    const apiKey = process.env.PHANTOMBUSTER_API_KEY;
    const logs: string[] = [];

    // ─── Official API Path ─────────────────────────
    if (apiKey) {
        logs.push('[PhantomBuster] 🔑 API key detected — using PhantomBuster API');
        try {
            // PhantomBuster uses "Phantoms" (pre-built scrapers)
            // We'd trigger a phantom and poll for results
            // This is a placeholder — actual phantom IDs would be configured per use case
            const response = await fetch('https://api.phantombuster.com/api/v2/agents/fetch-output', {
                method: 'POST',
                headers: {
                    'X-Phantombuster-Key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: process.env.PHANTOMBUSTER_AGENT_ID || '',
                    query
                })
            });

            if (!response.ok) throw new Error(`PhantomBuster API returned ${response.status}`);
            const data = await response.json();

            const contacts: PipelineContact[] = (data.resultObject || []).map((c: any) => ({
                name: c.name || c.fullName || '',
                email: c.email,
                title: c.title || c.headline,
                company: c.companyName,
                instagram: c.instagram,
                twitter: c.twitter,
                tiktok: c.tiktok,
                linkedin: c.linkedin,
                followers: c.followers?.toString(),
                url: c.profileUrl || c.linkedin || '',
                source: 'PhantomBuster (API)',
                confidence: 'high' as const
            }));

            logs.push(`[PhantomBuster] ✅ Found ${contacts.length} contacts via API`);
            return { contacts, source: 'PhantomBuster (API)', apiUsed: true, logs, total: contacts.length };
        } catch (error: any) {
            logs.push(`[PhantomBuster] ❌ API error: ${error.message} — falling back to social search`);
        }
    } else {
        logs.push('[PhantomBuster] ⚪ No API key — using social media search fallback');
    }

    // ─── Social Media Fallback ─────────────────────
    const [igProfiles, ttProfiles] = await Promise.allSettled([
        searchInstagram(query, country),
        searchTikTok(query, country)
    ]);

    const contacts: PipelineContact[] = [];

    if (igProfiles.status === 'fulfilled') {
        contacts.push(...igProfiles.value.map(p => ({
            name: p.name,
            instagram: p.url,
            url: p.url,
            source: 'PhantomBuster Fallback (Instagram via Google)',
            confidence: 'medium' as const
        })));
    }

    if (ttProfiles.status === 'fulfilled') {
        contacts.push(...ttProfiles.value.map(p => ({
            name: p.name,
            tiktok: p.url,
            url: p.url,
            source: 'PhantomBuster Fallback (TikTok via Google)',
            confidence: 'medium' as const
        })));
    }

    logs.push(`[PhantomBuster] ✅ Found ${contacts.length} profiles via social search fallback`);
    return { contacts, source: 'PhantomBuster Fallback (Social Search)', apiUsed: false, logs, total: contacts.length };
}

// ═══════════════════════════════════════════════════════
// DEEP SEARCH — ORCHESTRATE ALL PIPELINES
// ═══════════════════════════════════════════════════════

export interface DeepSearchResult {
    contacts: PipelineContact[];
    pipelineResults: Record<string, PipelineResult>;
    logs: string[];
    total: number;
    apisUsed: string[];
    apisUnavailable: string[];
}

/**
 * Run all pipelines in parallel and merge results.
 * This is the "nuclear option" for lead generation — hits every source.
 */
export async function performDeepSearch(query: string, country: string = 'ZA'): Promise<DeepSearchResult> {
    console.log(`[DeepSearch] 🚀 Launching all pipelines for "${query}" in ${country}`);

    const status = getPipelineStatus();
    const logs: string[] = [`[DeepSearch] Pipeline status: Apollo=${status.apollo ? '🟢' : '⚪'} LinkedIn=${status.linkedin ? '🟢' : '⚪'} ZoomInfo=${status.zoominfo ? '🟢' : '⚪'} PhantomBuster=${status.phantombuster ? '🟢' : '⚪'}`];

    // Run all pipelines in parallel
    const [apolloResult, linkedinResult, zoominfoResult, phantomResult] = await Promise.allSettled([
        searchApollo(query, country),
        searchLinkedInPipeline(query, country),
        searchZoomInfo(query, country),
        searchPhantomBuster(query, country)
    ]);

    const pipelineResults: Record<string, PipelineResult> = {};
    const allContacts: PipelineContact[] = [];
    const apisUsed: string[] = [];
    const apisUnavailable: string[] = [];

    // Collect results
    const pipelines = [
        { name: 'Apollo', result: apolloResult },
        { name: 'LinkedIn', result: linkedinResult },
        { name: 'ZoomInfo', result: zoominfoResult },
        { name: 'PhantomBuster', result: phantomResult }
    ];

    for (const { name, result } of pipelines) {
        if (result.status === 'fulfilled') {
            pipelineResults[name] = result.value;
            allContacts.push(...result.value.contacts);
            logs.push(...result.value.logs);
            if (result.value.apiUsed) apisUsed.push(name);
            else apisUnavailable.push(name);
        } else {
            logs.push(`[${name}] ❌ Pipeline failed: ${result.reason}`);
            apisUnavailable.push(name);
        }
    }

    // Deduplicate by name (keep highest confidence)
    const seen = new Map<string, PipelineContact>();
    for (const contact of allContacts) {
        const key = contact.name.toLowerCase().trim();
        if (!key || key.length < 3) continue;

        const existing = seen.get(key);
        if (!existing) {
            seen.set(key, contact);
        } else {
            // Merge: keep higher confidence, fill empty fields
            const merged = { ...existing };
            if (contact.confidence === 'high' || (contact.confidence === 'medium' && existing.confidence === 'low')) {
                merged.confidence = contact.confidence;
            }
            if (!merged.email && contact.email) merged.email = contact.email;
            if (!merged.linkedin && contact.linkedin) merged.linkedin = contact.linkedin;
            if (!merged.instagram && contact.instagram) merged.instagram = contact.instagram;
            if (!merged.twitter && contact.twitter) merged.twitter = contact.twitter;
            if (!merged.tiktok && contact.tiktok) merged.tiktok = contact.tiktok;
            if (!merged.phone && contact.phone) merged.phone = contact.phone;
            if (!merged.title && contact.title) merged.title = contact.title;
            if (!merged.company && contact.company) merged.company = contact.company;
            seen.set(key, merged);
        }
    }

    const deduped = [...seen.values()];

    // Sort: high confidence first, then medium, then low
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    deduped.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence]);

    logs.push(`[DeepSearch] ✅ Total: ${deduped.length} unique contacts (from ${allContacts.length} raw results)`);

    return {
        contacts: deduped,
        pipelineResults,
        logs,
        total: deduped.length,
        apisUsed,
        apisUnavailable
    };
}
