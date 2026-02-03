import { NextRequest, NextResponse } from 'next/server';
import { parseIntent, ParsedIntent } from '@/lib/gemini';
import { getLeadsByCountry, filterLeads, getDatabaseSummary, DBLead, FilterOptions } from '@/lib/db';
import { performSmartSearch } from '@/lib/search';

// ... (keep interface definitions and helper functions like normalizeCountry, mapLeadsToResponse if needed, 
// OR just include the full file content if you are doing a full overwrite. Assuming full overwrite based on tool usage)

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

    // Check for continuation
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

    // Extract country
    if (lower.includes('uk') || lower.includes('united kingdom')) intent.filters.country = 'UK';
    else if (lower.includes('usa') || lower.includes('america')) intent.filters.country = 'USA';
    else intent.filters.country = 'ZA';

    // Extract category
    if (lower.includes('amapiano')) intent.filters.category = 'Amapiano';
    else if (lower.includes('hip hop') || lower.includes('rap')) intent.filters.category = 'Hip-Hop';
    else if (lower.includes('podcast')) intent.filters.category = 'Podcast';

    intent.filters.searchTerm = message;

    return intent;
}

// Local performExaSearch removed. Using lib/search.ts instead.


import { getContextPack } from '@/lib/god-mode';

// ... (existing imports)

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        // REMOVE artistContext from body - we fetch it server-side now (Source of Truth)
        const { message, conversationHistory = [], lastSearchState, tier = 'instant', mode = 'chat' } = body;

        // Legacy support: if old 'query' field is used
        const userMessage = message || body.query;

        if (!userMessage) {
            return NextResponse.json({
                error: 'Message required',
                message: '❌ Please provide a message.',
                leads: []
            }, { status: 400 });
        }

        // FETCH GOD MODE CONTEXT
        const artistContext = await getContextPack();

        // HARD GATE: Require artist profile (PortalGate)
        if (!artistContext) {
            return NextResponse.json({
                error: 'portal_required',
                message: 'Please set up your Artist Portal to continue.'
            }, { status: 403 });
        }

        // HARD GATE: Failsafe when critical fields are missing
        const missing: string[] = [];
        if (!artistContext.identity?.genre) missing.push('Genre');
        if (!artistContext.location?.country) missing.push('Target Location');
        if (missing.length) {
            return NextResponse.json({
                error: 'data_gap',
                missing,
                message: `Artist Portal is missing: ${missing.join(', ')}. Please update it before I can search.`
            }, { status: 409 });
        }

        const logs: string[] = [];
        let leads: LeadResponse[] = [];
        let intent: ParsedIntent;

        // Tier-based logging
        const tierLabels = {
            instant: '⚡ Instant Mode',
            business: '💼 Business Mode',
            enterprise: '🚀 Enterprise Mode'
        };
        logs.push(`${tierLabels[tier as keyof typeof tierLabels] || tierLabels.instant}`);
        logs.push(mode === 'research' ? '🔬 Research Mode Active' : '💬 Chat Mode Active');
        if (!artistContext) logs.push('⚠️ No Artist Portal Context Found');
        else logs.push(`👤 Context Loaded: ${artistContext.identity.name}`);

        // Check if Gemini API is available
        const hasGemini = !!process.env.GEMINI_API_KEY;

        if (mode === 'research') {
            // FORCE RESEARCH MODE
            // We can still use Gemini to parse *filters* (country, genre) but the action is forced to 'search'
            logs.push('🧠 Visio: Analyzing research parameters...');

            if (hasGemini) {
                intent = await parseIntent(userMessage, conversationHistory, artistContext || undefined, tier as any, 'research'); // Use existing parser for filters
            } else {
                intent = parseBasicIntent(userMessage, lastSearchState);
            }

            // OVERRIDE: Force action to search, enforce limits
            intent.action = 'search';

            // Limit Logic: 100 for Enterprise, 30 for others
            const limit = tier === 'enterprise' ? 100 : 30;
            intent.limit = limit;
            logs.push(`🎯 Target: Finding top ${limit} leads`);

        } else {
            // CHAT MODE (Default)
            if (hasGemini) {
                // Use AI to parse intent with tier
                logs.push('🧠 Visio: Analyzing your request...');
                intent = await parseIntent(userMessage, conversationHistory, artistContext || undefined, tier as 'instant' | 'business' | 'enterprise', mode as 'chat' | 'research');

                // If the user explicitly asks to "find leads" or "search", we honor it.
                // Otherwise, the prompt should naturally lean towards chat.
                // We'll trust the parser, but we can add a nudge if needed.
                logs.push(`📋 Strategy: ${intent.action}`);
            } else {
                // Fallback: basic keyword parsing
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
                    } else {
                        logs.push('⚠️ No local matches found, trying external search...');
                    }
                }

                // 2. Fallback to Exa (External Search) if no local leads or country is not ZA
                // OR if user specifically asked for "web" or "search" (logic can be refined)
                if (leads.length === 0) {
                    const status = country === 'ZA' ? 'expand' : 'external';
                    logs.push(status === 'expand' ? '🌐 Expanding search to the web...' : `🌐 Searching external sources in ${country}...`);

                    const exaLeads = await performSmartSearch(intent.filters?.searchTerm || userMessage, country);
                    // Map SearchResult to LeadResponse structure 
                    const mappedExaLeads: LeadResponse[] = exaLeads.map(lead => ({
                        ...lead,
                        // Ensure all LeadResponse fields are present if missing optional ones
                        snippet: lead.snippet || '',
                        source: lead.source || 'Exa Neural Search'
                    }));
                    leads = [...leads, ...mappedExaLeads];
                    logs.push(`✅ Found ${exaLeads.length} web results`);
                }

                break;
            }

            case 'continue': {
                logs.push('🔄 Loading more results...');
                // Implementation for pagination would go here
                break;
            }

            case 'clarify': {
                logs.push('❓ Needs clarification');
                break;
            }

            case 'unavailable': {
                logs.push('❌ Request out of scope/unavailable');
                break;
            }

            case 'data_gap': {
                logs.push('⚠️ Failsafe Triggered: Missing Portal Data');
                break;
            }
        }

        let assistantMessage = intent.message || "Here are the results.";

        // If searching, generate a summary response based on results
        if (intent.action === 'search' && !intent.message) {
            // We can add a small helper here to summarize results if Gemini didn't provide a specific message
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
