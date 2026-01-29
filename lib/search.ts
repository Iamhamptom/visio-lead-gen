import Exa from 'exa-js';

export interface SearchResult {
    id: number;
    name: string;
    url: string;
    snippet: string;
    source?: string;
    company?: string;
    title?: string;
}

export async function performSmartExaSearch(query: string, country: string = 'ZA'): Promise<SearchResult[]> {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
        console.warn('EXA_API_KEY not configured');
        return [];
    }

    const exa = new Exa(apiKey);

    // Smart Context Enforcement
    // We want to avoid ambiguous terms (e.g., "drill" -> construction vs music)
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

    console.log(`[Exa] Executing Smart Search: "${richQuery}" (Original: "${query}")`);

    try {
        const result = await exa.searchAndContents(richQuery, {
            type: 'neural',
            useAutoprompt: true,
            numResults: 10,
            text: true,
        });

        return result.results.map((r: any, i: number) => ({
            id: -(i + 1), // Negative IDs for external results
            name: r.title || 'Unknown',
            url: r.url,
            snippet: r.text?.substring(0, 200) + '...' || '',
            source: 'Exa Neural Search (Live Web)',
            company: r.author || '',
            title: 'Web Result'
        }));

    } catch (e) {
        console.error('Exa search failed:', e);
        return [];
    }
}
