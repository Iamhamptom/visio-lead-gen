import { NextRequest, NextResponse } from 'next/server';
import { performGoogleSearch } from '@/lib/serper';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const name = typeof body?.name === 'string' ? body.name.trim() : '';
        const country = typeof body?.country === 'string' ? body.country.trim() : '';
        const city = typeof body?.city === 'string' ? body.city.trim() : '';

        if (!name) {
            return NextResponse.json({ results: [] }, { status: 200 });
        }

        const location = [city, country].filter(Boolean).join(', ');
        const query = location ? `${name} ${location}` : name;

        const results = await performGoogleSearch(query, country || 'ZA');

        return NextResponse.json({
            query,
            results: results.slice(0, 6).map(r => ({
                title: r.title,
                link: r.link,
                snippet: r.snippet,
                source: r.source
            }))
        });
    } catch (error) {
        console.error('Identity lookup failed:', error);
        return NextResponse.json({ results: [] }, { status: 200 });
    }
}
