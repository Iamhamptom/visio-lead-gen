import { NextRequest, NextResponse } from 'next/server';
import { performSmartSearch } from '@/lib/search';
import { enrichLead } from '@/lib/enrichment';
import { Lead } from '@/app/types';
import { logSearchQuery } from '@/lib/data-service';
import { requireUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
    try {
        const auth = await requireUser(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { query, country } = await request.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        // Use strict music/entertainment context search
        const results = await performSmartSearch(query, country || 'ZA');

        const logs = [
            `> Received query: "${query}"`,
            `> Using Smart Context Search (Music/Entertainment enforced)...`,
            `> Found ${results.length} results.`,
            `> SUCCESS: Results ready.`,
        ];

        // Log query for analytics (fire and forget)
        logSearchQuery(query, country || 'ZA', results.length).catch(e => console.error('Failed to log search:', e));

        // Optional Enrichment (e.g. if query asks for "emails")
        // Basic heuristic: if query implies contact info, try to enrich top 3
        const shouldEnrich = query.toLowerCase().includes('email') || query.toLowerCase().includes('contact');

        let finalLeads = results;

        if (shouldEnrich && process.env.APOLLO_API_KEY) {
            logs.push(`> Enrichment requested. Enriching top results...`);

            // Map SearchResult to partial Lead for enrichment
            const enrichedPromises = results.slice(0, 3).map(async (r) => {
                // Construct a temporary partial Lead object
                // We cast to any for the input because we are building it up
                const partialLead: any = {
                    id: r.id.toString(), // Convert number ID to string
                    name: r.name,
                    title: r.title || 'Unknown',
                    company: r.company || r.source || '',
                    email: '',
                    phone: '',
                    matchScore: 0,
                    socials: {}
                };
                return await enrichLead(partialLead as Lead);
            });

            const enriched = await Promise.all(enrichedPromises);

            // Merge back
            // Merge back
            finalLeads = results.map((r, i) => {
                if (i < 3) {
                    const e = enriched[i];
                    // e is a Lead (id: string), r is SearchResult (id: number)
                    // We'll return the enriched object but preserve the numeric ID from search result 
                    // to satisfy the SearchResult[] type if possible, OR just return 'any'
                    // For now, let's just spread `r` last to keep `id` as number, but overlay enriched fields.
                    // Except `e` has `id` string which might overwrite if spread after.
                    // Let's force `id` to be the numeric one.
                    return { ...e, ...r, id: r.id };
                }
                return r;
            });
            logs.push(`> Enriched ${enriched.length} leads.`);
        }

        return NextResponse.json({
            leads: finalLeads,
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
