import { NextRequest, NextResponse } from 'next/server';
import { parseIntent, ParsedIntent } from '@/lib/gemini';
import { getLeadsByCountry, filterLeads, getDatabaseSummary, DBLead, FilterOptions } from '@/lib/db';
import { performSmartSearch } from '@/lib/search';
import { getContextPack } from '@/lib/god-mode';
import { searchKnowledgeBase } from '@/lib/rag'; // New RAG Import

interface LeadResponse {
    id: number;
    name: string;
    company?: string;
    title?: string;
    email?: string;
    url: string;
    snippet: string;
    source?: string;
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    followers?: string;
}

// Normalize country input
function normalizeCountry(input: string | null | undefined): string {
    if (!input) return 'ZA';
    const clean = input.toUpperCase().replace(/\s/g, '');

    if (['SOUTHAFRICA', 'SA', 'MZANSI', 'RSA', 'ZA'].includes(clean)) return 'ZA';
    if (['UK', 'UNITEDKINGDOM', 'ENGLAND', 'BRITAIN'].includes(clean)) return 'UK';
    if (['USA', 'UNITEDSTATES', 'AMERICA', 'US'].includes(clean)) return 'USA';
    if (['CANADA', 'CA'].includes(clean)) return 'CANADA';

    return clean || 'ZA';
}

// Convert DB leads to API response format
function mapLeadsToResponse(leads: DBLead[], country: string): LeadResponse[] {
    return leads.map((l, i) => ({
        id: parseInt(l.id) || i + 1,
        name: l.person,
        company: l.company,
        title: l.title || l.industry,
        email: l.email || '',
        url: '',
        snippet: `${l.industry} • ${country} Database`,
        source: 'Local Database (Instant)',
        instagram: (l as any).instagram || '',
        tiktok: (l as any).tiktok || '',
        twitter: (l as any).twitter || '',
        followers: (l as any).followers || ''
    }));
}

// Basic keyword parsing fallback
function parseBasicIntent(message: string, lastState?: any): ParsedIntent {
    const lower = message.toLowerCase();

    if (lastState && (lower.includes('more') || lower.includes('next') || lower.includes('continue'))) {
        return {
            action: 'continue',
            filters: lastState.filters || {},
            limit: 50,
            message: 'Loading more results...'
        };
    }

    const intent: ParsedIntent = {
        action: 'search',
        filters: {},
        limit: 50,
        message: ''
    };

    if (lower.includes('uk') || lower.includes('united kingdom')) intent.filters.country = 'UK';
    else if (lower.includes('usa') || lower.includes('america')) intent.filters.country = 'USA';
    else intent.filters.country = 'ZA';

    if (lower.includes('amapiano')) intent.filters.category = 'Amapiano';
    else if (lower.includes('hip hop') || lower.includes('rap')) intent.filters.category = 'Hip-Hop';
    else if (lower.includes('podcast')) intent.filters.category = 'Podcast';

    intent.filters.searchTerm = message;

    return intent;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, conversationHistory = [], lastSearchState, tier = 'instant', mode = 'chat' } = body;
        const userMessage = message || body.query;

        if (!userMessage) {
            return NextResponse.json({
                error: 'Message required',
                message: '❌ Please provide a message.',
                leads: []
            }, { status: 400 });
        }

        const logs: string[] = [];
        let leads: LeadResponse[] = [];
        let intent: ParsedIntent;

        // 1. FETCH ARTIST CONTEXT (Source of Truth)
        // We no longer block if null, we just pass null/undefined.
        const artistContext = await getContextPack();

        // 2. FETCH VISIO BRAIN KNOWLEDGE (RAG)
        // Helper to formatting knowledge chunk
        let knowledgeContext = '';
        try {
            logs.push('🔍 Searching Visio Brain...');
            const relevantChunks = await searchKnowledgeBase(userMessage, 3);
            if (relevantChunks && relevantChunks.length > 0) {
                knowledgeContext = relevantChunks.map(c =>
                    `[Internal Knowledge - ${c.category}]: ${c.content}`
                ).join('\n\n');
                logs.push(`✅ Found ${relevantChunks.length} strategies in Brain`);
            } else {
                logs.push('⚪ Use General Knowledge');
            }
        } catch (e) {
            console.error('RAG Error', e);
            logs.push('⚠️ Brain Offline - Using generic logic');
        }

        const tierLabels = {
            instant: '⚡ Instant Mode',
            business: '💼 Business Mode',
            enterprise: '🚀 Enterprise Mode'
        };
        logs.push(`${tierLabels[tier as keyof typeof tierLabels] || tierLabels.instant}`);
        if (!artistContext) logs.push('⚠️ No Artist Portal - Running in General Mode');
        else logs.push(`👤 Context Loaded: ${artistContext.identity.name}`);

        const hasGemini = !!process.env.GEMINI_API_KEY;

        if (mode === 'research') {
            logs.push('🧠 Visio: Analyzing research parameters...');
            if (hasGemini) {
                // PASS KNOWLEDGE CONTEXT
                intent = await parseIntent(userMessage, conversationHistory, artistContext || undefined, tier as any, 'research', knowledgeContext);
            } else {
                intent = parseBasicIntent(userMessage, lastSearchState);
            }
            intent.action = 'search';
            const limit = tier === 'enterprise' ? 100 : 30;
            intent.limit = limit;

        } else {
            // CHAT MODE
            if (hasGemini) {
                const intentMode = 'chat'; // Explicitly typed
                // PASS KNOWLEDGE CONTEXT
                logs.push('🧠 Visio: Thinking...');
                intent = await parseIntent(userMessage, conversationHistory, artistContext || undefined, tier as 'instant' | 'business' | 'enterprise', intentMode, knowledgeContext);
            } else {
                logs.push('⚠️ AI offline - using basic mode');
                intent = parseBasicIntent(userMessage, lastSearchState);
            }
        }

        // Handle different actions
        switch (intent.action) {
            case 'search': {
                const country = normalizeCountry(intent.filters?.country);

                // 1. Try Local Database First (if South Africa)
                if (country === 'ZA') {
                    logs.push('📂 Searching local ZA database...');
                    const options: FilterOptions = {
                        category: intent.filters?.category || undefined,
                        minFollowers: intent.filters?.minFollowers || undefined,
                        maxFollowers: intent.filters?.maxFollowers || undefined,
                        searchTerm: intent.filters?.searchTerm || undefined
                    };
                    const dbLeads = getLeadsByCountry('ZA');
                    const filtered = filterLeads(dbLeads, options);
                    if (filtered.results.length > 0) {
                        leads = mapLeadsToResponse(filtered.results.slice(0, intent.limit || 50), 'South Africa');
                        logs.push(`✅ Found ${leads.length} leads in database`);
                    }
                }

                // 2. Fallback to Exa
                if (leads.length === 0) {
                    const status = country === 'ZA' ? 'expand' : 'external';
                    logs.push(status === 'expand' ? '🌐 Expanding search to the web...' : `🌐 Searching external sources in ${country}...`);
                    const exaLeads = await performSmartSearch(intent.filters?.searchTerm || userMessage, country);
                    const mappedExaLeads: LeadResponse[] = exaLeads.map(lead => ({
                        ...lead,
                        snippet: lead.snippet || '',
                        source: lead.source || 'Exa Neural Search'
                    }));
                    leads = [...leads, ...mappedExaLeads];
                    logs.push(`✅ Found ${exaLeads.length} web results`);
                }
                break;
            }
            case 'data_gap': {
                logs.push('⚠️ Failsafe Triggered: Missing Portal Data');
                break;
            }
        }

        let assistantMessage = intent.message || "Here are the results.";
        if (intent.action === 'search' && !intent.message) {
            assistantMessage = `Found ${leads.length} results for your search.`;
        }

        return NextResponse.json({
            message: assistantMessage,
            leads: leads,
            logs: logs,
            intent: intent,
            meta: {
                total: leads.length,
                source: leads.some(l => l.source?.includes('Exa')) ? 'Hybrid (DB + Web)' : 'Local DB'
            }
        });

    } catch (error: any) {
        console.error('Agent Error:', error);
        return NextResponse.json({
            error: 'Internal processing error',
            message: 'Sorry, I encountered an error processing your request.'
        }, { status: 500 });
    }
}
