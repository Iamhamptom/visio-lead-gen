import Exa from 'exa-js';
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

export async function performSmartSearch(query: string, country: string = 'ZA'): Promise<SearchResult[]> {
    const exaApiKey = process.env.EXA_API_KEY;
    const serperApiKey = process.env.SERPER_API_KEY;

    // Smart Context Enforcement
    let richQuery = query;
    const lowerQ = query.toLowerCase();

    // Expanded safe keywords list
    const safeKeywords = [
        'music', 'entertainment', 'blog', 'magazine', 'artist', 'rapper', 'dj',
        'producer', 'label', 'record', 'song', 'album', 'genre', 'media',
        'playlist', 'curator', 'radio', 'press', 'interview', 'podcast',
        'manager', 'booking', 'festival', 'club', 'venue', 'chart'
    ];

    const hasSafeKeyword = safeKeywords.some(k => lowerQ.includes(k));

    if (!hasSafeKeyword) {
        // Append explicit context if missing
        richQuery = `${query} music entertainment industry`;
    }

    // Always ensure country context is appended if missing
    if (!lowerQ.includes(country.toLowerCase())) {
        if (country === 'ZA') richQuery = `${richQuery} in South Africa`;
        else if (country === 'UK') richQuery = `${richQuery} in UK`;
        else if (country === 'USA') richQuery = `${richQuery} in USA`;
        else richQuery = `${richQuery} in ${country}`;
    }

    console.log(`[MetaSearch] Executing "${richQuery}"`);

    const promises: Promise<SearchResult[]>[] = [];

    // 1. Exa (Neural)
    if (exaApiKey) {
        promises.push((async () => {
            try {
                const exa = new Exa(exaApiKey);
                const result = await exa.searchAndContents(richQuery, {
                    type: 'neural',
                    useAutoprompt: true,
                    numResults: 8,
                    text: true,
                });
                return result.results.map((r: any, i: number) => ({
                    id: -(i + 1),
                    name: r.title || 'Unknown',
                    url: r.url,
                    snippet: r.text?.substring(0, 200) + '...' || '',
                    source: 'Exa Neural',
                    company: r.author || '',
                    title: 'Web Result'
                }));
            } catch (e) {
                console.error('Exa search failed:', e);
                return [];
            }
        })());
    } else {
        console.warn('EXA_API_KEY missing, skipping neural search');
    }

    // 2. Serper (Google)
    if (serperApiKey) {
        promises.push((async () => {
            const googleResults = await performGoogleSearch(richQuery, country);
            return googleResults.map((r, i) => ({
                id: -(100 + i), // Different ID range
                name: r.title,
                url: r.link,
                snippet: r.snippet,
                source: 'Google',
                imageUrl: r.imageUrl,
                date: r.date
            }));
        })());
    } else {
        console.warn('SERPER_API_KEY missing, skipping Google search');
    }

    // Wait for all
    const results = await Promise.all(promises);
    const flatResults = results.flat();

    // Deduplicate by URL
    const seenUrls = new Set();
    const uniqueResults = flatResults.filter(r => {
        if (seenUrls.has(r.url)) return false;
        seenUrls.add(r.url);
        return true;
    });

    return uniqueResults;
}
