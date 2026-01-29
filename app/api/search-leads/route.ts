import { NextRequest, NextResponse } from 'next/server';
import { performSmartExaSearch } from '@/lib/search';

export async function POST(request: NextRequest) {
    try {
        const { query, country } = await request.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        // Use strict music/entertainment context search
        const results = await performSmartExaSearch(query, country || 'ZA');

        const logs = [
            `> Received query: "${query}"`,
            `> Using Smart Context Search (Music/Entertainment enforced)...`,
            `> Found ${results.length} results.`,
            `> SUCCESS: Results ready.`,
        ];

        return NextResponse.json({
            leads: results,
            logs,
            success: true
        });

    } catch (error: any) {
        console.error('Search error:', error);
        return NextResponse.json({
            error: error.message || 'Search failed',
            leads: [],
            logs: [`> ERROR: ${error.message}`]
        }, { status: 500 });
    }
}
