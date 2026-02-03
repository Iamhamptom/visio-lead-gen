export interface ScrapeResult {
    content: string;
    markdown: string;
    metadata?: any;
    url: string;
}

export async function scrapeUrl(url: string): Promise<ScrapeResult | null> {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
        console.warn('FIRECRAWL_API_KEY not configured');
        return null;
    }

    try {
        // Firecrawl v1 API structure
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                formats: ['markdown']
            })
        });

        if (!response.ok) {
            console.error('Firecrawl API error:', response.statusText);
            return null;
        }

        const data = await response.json();

        if (!data.success || !data.data) return null;

        return {
            content: data.data.content || '', // fallback
            markdown: data.data.markdown || '',
            metadata: data.data.metadata,
            url: url
        };

    } catch (error) {
        console.error('Firecrawl scrape failed:', error);
        return null;
    }
}
