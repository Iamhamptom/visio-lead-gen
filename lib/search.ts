import { performGoogleSearch } from './serper';

export interface SearchResult {
    id: number;
    name: string;
    url: string;
    snippet: string;
    source?: string;
    company?: string;
    title?: string;
    imageUrl?: string;
    date?: string;
}

/**
 * Perform a general-purpose smart search with entertainment context enforcement.
 */
export async function performSmartSearch(query: string, country: string = 'ZA'): Promise<SearchResult[]> {
    const serperApiKey = process.env.SERPER_API_KEY;

    let richQuery = query;
    const lowerQ = query.toLowerCase();

    const safeKeywords = [
        'music', 'entertainment', 'blog', 'magazine', 'artist', 'rapper', 'dj',
        'producer', 'label', 'record', 'song', 'album', 'genre', 'media',
        'playlist', 'curator', 'radio', 'press', 'interview', 'podcast',
        'manager', 'booking', 'festival', 'club', 'venue', 'chart',
        'pr', 'publicist', 'journalist', 'writer', 'editor', 'contact'
    ];

    const hasSafeKeyword = safeKeywords.some(k => lowerQ.includes(k));

    if (!hasSafeKeyword) {
        richQuery = `${query} music entertainment industry`;
    }

    if (!lowerQ.includes(country.toLowerCase())) {
        const countryLabels: Record<string, string> = {
            'ZA': 'South Africa', 'UK': 'UK', 'USA': 'USA',
            'NG': 'Nigeria', 'GH': 'Ghana', 'KE': 'Kenya',
            'DE': 'Germany', 'FR': 'France', 'AU': 'Australia',
            'CA': 'Canada', 'JP': 'Japan', 'BR': 'Brazil'
        };
        const label = countryLabels[country] || country;
        richQuery = `${richQuery} in ${label}`;
    }

    console.log(`[SmartSearch] Executing "${richQuery}"`);

    if (!serperApiKey) {
        console.warn('SERPER_API_KEY missing, skipping Google search');
        return [];
    }

    const googleResults = await performGoogleSearch(richQuery, country);
    return googleResults.map((r, i) => ({
        id: -(i + 1),
        name: r.title,
        url: r.link,
        snippet: r.snippet,
        source: 'Google',
        imageUrl: r.imageUrl,
        date: r.date
    }));
}

/**
 * Perform a lead-specific search optimized for finding contacts.
 * Generates richer queries and uses multiple search strategies.
 */
export async function performLeadSearch(query: string, country: string = 'ZA'): Promise<SearchResult[]> {
    const serperApiKey = process.env.SERPER_API_KEY;
    if (!serperApiKey) {
        console.warn('SERPER_API_KEY missing');
        return [];
    }

    // The AI may already have optimized the query, but we do a final polish
    let leadQuery = query;

    // Ensure contact-finding terms are present
    const contactTerms = ['email', 'contact', 'submit', 'booking', 'reach'];
    const hasContactTerm = contactTerms.some(t => query.toLowerCase().includes(t));
    if (!hasContactTerm) {
        leadQuery = `${query} contact email submit`;
    }

    console.log(`[LeadSearch] Executing "${leadQuery}" for ${country}`);

    // Primary search
    const primaryResults = await performGoogleSearch(leadQuery, country);

    // Secondary search with slightly different framing (broader net)
    const secondaryQuery = query.replace(/email|contact|submit/gi, '').trim() + ' music blog site list';
    const secondaryResults = await performGoogleSearch(secondaryQuery, country);

    // Merge and deduplicate by URL
    const seen = new Set<string>();
    const allResults = [...primaryResults, ...secondaryResults].filter(r => {
        if (seen.has(r.link)) return false;
        seen.add(r.link);
        return true;
    });

    return allResults.map((r, i) => ({
        id: -(i + 1),
        name: r.title,
        url: r.link,
        snippet: r.snippet,
        source: 'Lead Search',
        company: extractCompany(r.title),
        imageUrl: r.imageUrl,
        date: r.date
    }));
}

/** Try to extract a company/blog name from a search result title */
function extractCompany(title: string): string {
    // Common patterns: "Name | Company", "Name - Company", "Company: Name"
    const separators = [' | ', ' - ', ': ', ' — ', ' – '];
    for (const sep of separators) {
        if (title.includes(sep)) {
            const parts = title.split(sep);
            // Return the shorter part (usually the company/brand name)
            return parts.reduce((a, b) => a.length <= b.length ? a : b).trim();
        }
    }
    return '';
}

