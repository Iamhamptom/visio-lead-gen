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

interface WebResult {
    title: string;
    url: string;
    snippet?: string;
    source?: string;
    date?: string;
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
        const { message, conversationHistory = [], lastSearchState, tier = 'instant', mode = 'chat', webSearchEnabled = true, activeTool = 'none' } = body;
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
        let webResults: WebResult[] = [];
        let toolUsed: string | null = null;
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
                logs.push('🧠 Visio: Thinking (Chat Mode)...');
                const toolInstructions: Record<string, string> = {
                    web_search: 'Use SEARCH_REQUEST if the user needs fresh facts. Keep the query short and specific.',
                    summarize_chat: 'Summarize the conversation so far in 4-6 sentences. Focus on decisions and next steps. No headings.',
                    draft_pitch: 'Write a concise PR pitch email. Include a subject line, then 2 short paragraphs. Keep it warm and strategic.',
                    press_release: 'Draft a short press release. Provide a headline, then 2 brief paragraphs. Keep it factual and clean.',
                    social_pack: 'Create 5 social post ideas with short captions. Keep each to 1-2 sentences.',
                    market_research: 'Give a quick market snapshot with key trends and what they mean for the artist. 4-6 sentences.'
                };
                const toolInstruction = toolInstructions[activeTool] || '';
                const toolWrappedMessage = toolInstruction
                    ? `${toolInstruction}\n\nUser request: ${userMessage}`
                    : userMessage;
                if (toolInstruction && activeTool !== 'web_search') {
                    toolUsed = activeTool;
                }
                intent = await parseIntent(toolWrappedMessage, conversationHistory, artistContext || undefined, tier as 'instant' | 'business' | 'enterprise', intentMode, knowledgeContext);

                // --- TOOL USE INTERCEPTOR ---
                // Check if the AI wants to use a tool (Search)
                if (intent.message && intent.message.startsWith('SEARCH_REQUEST:')) {
                    const query = intent.message.replace('SEARCH_REQUEST:', '').trim();
                    if (!webSearchEnabled) {
                        logs.push('🛑 Web search disabled by user.');
                        intent = {
                            ...intent,
                            action: 'clarify',
                            message: `Web search is currently off. I can answer from my internal knowledge, or you can toggle Web Search on for fresh sources.`
                        };
                    } else {
                        logs.push(`🛠️ Tool Triggered: Searching for "${query}"...`);

                        // Execute Search
                        const searchResults = await performSmartSearch(query, normalizeCountry(intent.filters?.country));
                        webResults = searchResults.map(r => ({
                            title: r.name,
                            url: r.url,
                            snippet: r.snippet,
                            source: r.source,
                            date: r.date
                        }));
                        toolUsed = toolUsed || 'web_search';

                        // Format results for the AI
                        const contextBlock = searchResults.map(r => `Title: ${r.name}\nSnippet: ${r.snippet}\nSource: ${r.source}`).join('\n\n');

                    // Re-prompt Gemini with the results
                    logs.push(`✅ Found ${searchResults.length} results. Re-prompting AI...`);
                    const toolPrompt = `
SYSTEM: You requested a search for "${query}". 
Here are the results:
${contextBlock}

INSTRUCTION: Now, using these search results, answer the user's original question: "${userMessage}".
Cite the sources naturally if relevant. Write in your standard Visio persona (warm, professional, strategic).
`;
                    // We call parseIntent again (effectively a "Tool Output" turn) but treat it as a new standard chat generation
                    // We clear history for this specific turn or append? Appending is safer.
                        const finalIntent = await parseIntent(toolPrompt, conversationHistory, artistContext || undefined, tier as any, 'chat', '');
                        intent = finalIntent; // Replace the "SEARCH_REQUEST" intent with the final answer
                    }
                }
                // ---------------------------

            } else {
                logs.push('⚠️ AI offline - using basic mode');
                intent = parseBasicIntent(userMessage, lastSearchState);
            }
        }

        const portalRequired = !artistContext && (mode === 'research' || intent.action === 'search');
        if (portalRequired) {
            logs.push('🔒 Portal required for research/leads.');
            return NextResponse.json({
                message: 'Complete your profile in Settings to unlock research and lead generation.',
                leads: [],
                logs,
                intent: { ...intent, action: 'data_gap' },
                meta: {
                    total: 0,
                    source: 'Portal Required'
                }
            }, { status: 403 });
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
            webResults,
            toolUsed,
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
