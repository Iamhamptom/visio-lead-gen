export interface SerperResult {
    title: string;
    link: string;
    snippet: string;
    position: number;
    date?: string;
    source?: string;
    imageUrl?: string;
}

export async function performGoogleSearch(query: string, country: string = 'gl=za'): Promise<SerperResult[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
        console.warn('SERPER_API_KEY not configured');
        return [];
    }

    try {
        const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                q: query,
                gl: country === 'ZA' ? 'za' : 'us', // Basic mapping, can be expanded
                num: 10
            })
        });

        if (!response.ok) {
            console.error('Serper API error:', response.statusText);
            return [];
        }

        const data = await response.json();

        if (!data.organic) return [];

        return data.organic.map((item: any) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            position: item.position,
            date: item.date,
            source: 'Google (Serper)',
            imageUrl: item.imageUrl
        }));

    } catch (error) {
        console.error('Serper search failed:', error);
        return [];
    }
}
