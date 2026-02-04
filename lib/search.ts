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
