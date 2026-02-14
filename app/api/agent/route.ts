import { NextRequest, NextResponse } from 'next/server';
import { parseIntent, ParsedIntent, createGeminiClient } from '@/lib/gemini';
import { getLeadsByCountry, filterLeads, getDatabaseSummary, DBLead, FilterOptions } from '@/lib/db';
import { performSmartSearch, performLeadSearch } from '@/lib/search';
import { getContextPack } from '@/lib/god-mode';
import { searchKnowledgeBase } from '@/lib/rag';
import { getToolInstruction, TOOL_REGISTRY } from '@/lib/tools';
import { performDeepSearch, searchApollo, searchLinkedInPipeline, getPipelineStatus, PipelineContact } from '@/lib/pipelines';
import { scrapeContactsFromUrl, scrapeMultipleUrls } from '@/lib/scraper';
import { searchAllSocials, flattenSocialResults } from '@/lib/social-search';
import { requireUser, isAdminUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Maps subscription tiers to allowed AI tiers
const TIER_TO_AI_TIER: Record<string, string[]> = {
    'artist': ['instant'],
    'starter': ['instant', 'standard'],
    'artiste': ['instant', 'standard'],
    'starter_label': ['instant', 'standard', 'business'],
    'label': ['instant', 'standard', 'business', 'enterprise'],
    'agency': ['instant', 'standard', 'business', 'enterprise'],
    'enterprise': ['instant', 'standard', 'business', 'enterprise']
};

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
    country?: string;
}

interface WebResult {
    title: string;
    url: string;
    snippet?: string;
    source?: string;
    date?: string;
}

// ─── Normalize Country ─────────────────────────────────
function normalizeCountry(input: string | null | undefined): string {
    if (!input) return 'ZA';
    const clean = input.toUpperCase().replace(/\s/g, '');

    const countryMap: Record<string, string> = {
        'SOUTHAFRICA': 'ZA', 'SA': 'ZA', 'MZANSI': 'ZA', 'RSA': 'ZA', 'ZA': 'ZA',
        'UK': 'UK', 'UNITEDKINGDOM': 'UK', 'ENGLAND': 'UK', 'BRITAIN': 'UK',
        'USA': 'USA', 'UNITEDSTATES': 'USA', 'AMERICA': 'USA', 'US': 'USA',
        'CANADA': 'CA', 'CA': 'CA',
        'NIGERIA': 'NG', 'NG': 'NG',
        'GHANA': 'GH', 'GH': 'GH',
        'KENYA': 'KE', 'KE': 'KE',
        'GERMANY': 'DE', 'DE': 'DE',
        'FRANCE': 'FR', 'FR': 'FR',
        'AUSTRALIA': 'AU', 'AU': 'AU',
    };

    return countryMap[clean] || clean || 'ZA';
}

// ─── Map DB Leads ──────────────────────────────────────
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
        followers: (l as any).followers || '',
        country: l.country || country
    }));
}

// ─── Basic Intent Fallback ─────────────────────────────
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

    // Detect lead-finding intent from keywords
    const leadKeywords = ['find', 'search', 'get', 'look for', 'discover', 'curators', 'blogs', 'journalists', 'contacts', 'leads', 'djs', 'radio'];
    const isLeadRequest = leadKeywords.filter(k => lower.includes(k)).length >= 2;

    const intent: ParsedIntent = {
        action: isLeadRequest ? 'find_leads' : 'search',
        filters: {},
        limit: 50,
        message: ''
    };

    if (lower.includes('uk') || lower.includes('united kingdom')) intent.filters.country = 'UK';
    else if (lower.includes('usa') || lower.includes('america')) intent.filters.country = 'USA';
    else if (lower.includes('nigeria')) intent.filters.country = 'NG';
    else intent.filters.country = 'ZA';

    if (lower.includes('amapiano')) intent.filters.category = 'Amapiano';
    else if (lower.includes('hip hop') || lower.includes('rap')) intent.filters.category = 'Hip-Hop';
    else if (lower.includes('podcast')) intent.filters.category = 'Podcast';
    else if (lower.includes('afrobeats')) intent.filters.category = 'Afrobeats';

    intent.filters.searchTerm = message;

    return intent;
}

// ─── Extract Contacts from Search Results using Gemini ──
async function enrichLeadsWithAI(searchResults: any[], userMessage: string, tier: string): Promise<string> {
    try {
        const model = createGeminiClient(tier as any);
        const resultsContext = searchResults.slice(0, 10).map(r =>
            `Title: ${r.name || r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`
        ).join('\n\n');

        const prompt = `You are Visio, an elite PR strategist. The user asked: "${userMessage}"

I searched and found these results:
${resultsContext}

Provide a strategic summary using **rich markdown formatting**:
- Present contacts in a **markdown table** with columns: Name | Role | Company | Contact | Platform
- Use **numbered lists** for strategic recommendations and next steps
- Use **[clickable links](url)** for any URLs, profiles, or websites
- Use **bold** for names, platforms, and key terms
- Add a brief strategic note on why these contacts are relevant

End with 2-3 specific next steps (e.g., "Want me to draft a pitch to any of these?").`;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (e) {
        console.error('AI enrichment failed:', e);
        return '';
    }
}

// ═══════════════════════════════════════════════════════
// MAIN AGENT HANDLER
// ═══════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Input validation
        const VALID_TIERS = ['instant', 'standard', 'business', 'enterprise'];
        const VALID_MODES = ['chat', 'research'];

        const message = typeof body.message === 'string' ? body.message : '';
        const conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];
        const lastSearchState = body.lastSearchState;
        const tier = VALID_TIERS.includes(body.tier) ? body.tier : 'instant';
        const mode = VALID_MODES.includes(body.mode) ? body.mode : 'chat';
        const webSearchEnabled = typeof body.webSearchEnabled === 'boolean' ? body.webSearchEnabled : true;
        const activeTool = typeof body.activeTool === 'string' ? body.activeTool : 'none';

        const userMessage = message || (typeof body.query === 'string' ? body.query : '');

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
        let toolsUsed: string[] = [];
        let suggestedNextSteps: string[] = [];
        let intent: ParsedIntent;

        // Require auth for all agent calls to prevent paid-key abuse.
        const auth = await requireUser(request);
        if (!auth.ok) {
            return NextResponse.json(
                {
                    message: 'Unauthorized',
                    leads: [],
                    webResults: [],
                    toolsUsed: [],
                    suggestedNextSteps: [],
                    logs: ['🔒 Unauthorized'],
                    intent: { action: 'clarify', filters: {}, message: 'Please sign in.' }
                },
                { status: auth.status }
            );
        }

        // 0. VALIDATE TIER FROM DB (don't trust client-provided tier)
        let validatedTier = 'instant';
        if (!isAdminUser(auth.user)) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('subscription_tier')
                .eq('id', auth.user.id)
                .maybeSingle();
            const userSubTier = profile?.subscription_tier || 'artist';
            const allowedAiTiers = TIER_TO_AI_TIER[userSubTier] || ['instant'];
            validatedTier = allowedAiTiers.includes(tier) ? tier : allowedAiTiers[allowedAiTiers.length - 1];
        } else {
            validatedTier = tier; // Admins can use any tier
        }

        // 1. FETCH ARTIST CONTEXT
        const artistContext = await getContextPack({ userId: auth.user.id, accessToken: auth.accessToken });

        // 2. FETCH KNOWLEDGE BASE (RAG)
        let knowledgeContext = '';
        try {
            logs.push('🧠 Scanning Visio Brain...');
            const relevantChunks = await searchKnowledgeBase(userMessage, 3);
            if (relevantChunks && relevantChunks.length > 0) {
                knowledgeContext = relevantChunks.map(c =>
                    `[Internal Knowledge - ${c.category}]: ${c.content}`
                ).join('\n\n');
                logs.push(`✅ Found ${relevantChunks.length} strategies`);
            } else {
                logs.push('⚪ Using general knowledge');
            }
        } catch (e) {
            console.error('RAG Error', e);
            logs.push('⚠️ Brain offline — using general knowledge');
        }

        // Tier logging
        const tierLabels = {
            instant: '⚡ Instant Mode',
            business: '💼 Business Mode',
            enterprise: '🚀 Enterprise Mode'
        };
        logs.push(`${tierLabels[validatedTier as keyof typeof tierLabels] || tierLabels.instant}`);
        if (!artistContext) logs.push('⚠️ No Artist Portal — running in General Mode');
        else logs.push(`👤 Context: ${artistContext.identity.name}`);

        const hasGemini = !!process.env.GEMINI_API_KEY;

        // ─── RESEARCH MODE ─────────────────────────────
        if (mode === 'research') {
            logs.push('🔬 Research mode active...');
            if (hasGemini) {
                intent = await parseIntent(userMessage, conversationHistory, artistContext || undefined, validatedTier as any, 'research', knowledgeContext);
            } else {
                intent = parseBasicIntent(userMessage, lastSearchState);
            }
            // Force search action in research mode
            if (intent.action === 'clarify') intent.action = 'search';
            intent.limit = validatedTier === 'enterprise' ? 100 : 30;

            // ─── CHAT MODE ─────────────────────────────────
        } else {
            if (hasGemini) {
                // Build tool instruction if a specific tool is active
                const toolInstruction = getToolInstruction(activeTool);

                // Build the full message with persona + tool context
                const prAssistantContext = toolInstruction
                    ? `${toolInstruction}\n\nUser request: ${userMessage}`
                    : userMessage;

                if (toolInstruction && activeTool !== 'web_search') {
                    toolsUsed.push(activeTool);
                }

                logs.push('🧠 Visio is thinking...');
                intent = await parseIntent(
                    prAssistantContext,
                    conversationHistory,
                    artistContext || undefined,
                    validatedTier as 'instant' | 'business' | 'enterprise',
                    'chat',
                    knowledgeContext
                );

                // ─── LEAD_SEARCH TRIGGER ───────────────
                if (intent.message && intent.message.startsWith('LEAD_SEARCH:')) {
                    const leadQuery = intent.message.replace('LEAD_SEARCH:', '').trim();
                    logs.push(`🎯 Lead Finder activated: "${leadQuery}"`);
                    toolsUsed.push('find_leads');

                    if (!webSearchEnabled) {
                        logs.push('🛑 Web search disabled.');
                        intent = {
                            ...intent,
                            action: 'clarify',
                            message: `I'd love to find those contacts for you, but web search is currently off. Toggle it on and I'll start searching!`
                        };
                    } else {
                        const country = normalizeCountry(intent.filters?.country || artistContext?.location?.country);

                        // Search local DB first
                        if (country === 'ZA') {
                            const dbLeads = getLeadsByCountry('ZA');
                            const filtered = filterLeads(dbLeads, {
                                searchTerm: leadQuery,
                                category: intent.filters?.category || undefined
                            });
                            if (filtered.results.length > 0) {
                                leads = mapLeadsToResponse(filtered.results.slice(0, 20), 'South Africa');
                                logs.push(`📂 Found ${leads.length} in local database`);
                            }
                        }

                        // Web lead search
                        const webLeads = await performLeadSearch(leadQuery, country);
                        webResults = webLeads.map(r => ({
                            title: r.name,
                            url: r.url,
                            snippet: r.snippet,
                            source: r.source,
                            date: r.date
                        }));
                        logs.push(`🌐 Found ${webLeads.length} web results`);

                        // AI enrichment — summarize and extract contacts
                        const enrichedMessage = await enrichLeadsWithAI(webLeads, userMessage, validatedTier);
                        if (enrichedMessage) {
                            intent.message = enrichedMessage;
                        } else {
                            intent.message = `Found ${leads.length + webLeads.length} potential contacts. Check the results below!`;
                        }

                        suggestedNextSteps = [
                            'Draft a pitch to these contacts',
                            'Search for more contacts in a different market',
                            'Create an email outreach sequence'
                        ];
                    }
                }

                // ─── DEEP_SEARCH TRIGGER ──────────────
                else if (intent.message && intent.message.startsWith('DEEP_SEARCH:')) {
                    const deepQuery = intent.message.replace('DEEP_SEARCH:', '').trim();
                    logs.push(`🚀 Deep Search activated: "${deepQuery}"`);
                    toolsUsed.push('deep_search');

                    if (!webSearchEnabled) {
                        logs.push('🛑 Web search disabled.');
                        intent = { ...intent, action: 'clarify', message: 'Deep Search needs web access. Toggle Web Search on to use all pipelines!' };
                    } else {
                        const country = normalizeCountry(intent.filters?.country || artistContext?.location?.country);
                        const pipelineStatus = getPipelineStatus();
                        logs.push(`📡 Pipelines: Apify=${pipelineStatus.apify ? '🟢' : '⚪'} Apollo=${pipelineStatus.apollo ? '🟢' : '⚪'} LinkedIn=${pipelineStatus.linkedin ? '🟢' : '⚪'} ZoomInfo=${pipelineStatus.zoominfo ? '🟢' : '⚪'} PhantomBuster=${pipelineStatus.phantombuster ? '🟢' : '⚪'}`);

                        const deepResult = await performDeepSearch(deepQuery, country);
                        logs.push(...deepResult.logs);

                        // Map pipeline contacts to lead responses
                        leads = deepResult.contacts.slice(0, 30).map((c, i) => ({
                            id: -(i + 1),
                            name: c.name,
                            company: c.company,
                            title: c.title,
                            email: c.email,
                            url: c.url || '',
                            snippet: `${c.source} • Confidence: ${c.confidence}`,
                            source: c.source,
                            instagram: c.instagram,
                            tiktok: c.tiktok,
                            twitter: c.twitter,
                            followers: c.followers,
                            country
                        }));

                        // AI enrichment
                        const enrichedMessage = await enrichLeadsWithAI(leads, userMessage, validatedTier);
                        intent.message = enrichedMessage || `Deep Search found ${deepResult.total} unique contacts across ${deepResult.apisUsed.length > 0 ? deepResult.apisUsed.join(', ') : 'Google fallback'} pipelines.`;

                        suggestedNextSteps = [
                            'Draft a pitch to the top contacts',
                            'Scrape a specific result for more details',
                            'Search social media profiles',
                            'Create an email outreach sequence'
                        ];
                    }
                }

                // ─── SOCIAL_SEARCH TRIGGER ─────────────
                else if (intent.message && intent.message.startsWith('SOCIAL_SEARCH:')) {
                    const socialQuery = intent.message.replace('SOCIAL_SEARCH:', '').trim();
                    logs.push(`📱 Social Search activated: "${socialQuery}"`);
                    toolsUsed.push('social_search');

                    if (!webSearchEnabled) {
                        intent = { ...intent, action: 'clarify', message: 'Social Search needs web access. Toggle Web Search on!' };
                    } else {
                        const country = normalizeCountry(intent.filters?.country || artistContext?.location?.country);
                        const socialResults = await searchAllSocials(socialQuery, country);
                        const allProfiles = flattenSocialResults(socialResults);

                        leads = allProfiles.slice(0, 25).map((p, i) => ({
                            id: -(i + 1),
                            name: p.name,
                            url: p.url,
                            snippet: p.bio || '',
                            source: `${p.platform} (via Google)`,
                            instagram: p.platform === 'instagram' ? p.url : undefined,
                            tiktok: p.platform === 'tiktok' ? p.url : undefined,
                            twitter: p.platform === 'twitter' ? p.url : undefined,
                            country
                        }));

                        // Summarize by platform
                        const platformCounts = Object.entries(socialResults).map(([p, r]) => `${p}: ${r.length}`).join(', ');
                        logs.push(`✅ Found profiles: ${platformCounts}`);

                        const enrichedMessage = await enrichLeadsWithAI(leads, userMessage, validatedTier);
                        intent.message = enrichedMessage || `Found ${allProfiles.length} social profiles across platforms (${platformCounts}).`;

                        suggestedNextSteps = [
                            'Enrich a specific profile with more details',
                            'Draft a DM or pitch to these contacts',
                            'Deep search for email addresses'
                        ];
                    }
                }

                // ─── SCRAPE_URL TRIGGER ────────────────
                else if (intent.message && intent.message.startsWith('SCRAPE_URL:')) {
                    const scrapeUrl = intent.message.replace('SCRAPE_URL:', '').trim();
                    logs.push(`🕷️ Scraping: ${scrapeUrl}`);
                    toolsUsed.push('scrape_contacts');

                    const scrapeResult = await scrapeContactsFromUrl(scrapeUrl);

                    if (scrapeResult.success) {
                        logs.push(`✅ Scraped: ${scrapeResult.emails.length} emails, ${scrapeResult.contacts.length} contacts, ${Object.values(scrapeResult.socialLinks).flat().length} social links`);

                        leads = scrapeResult.contacts.map((c, i) => ({
                            id: -(i + 1),
                            name: c.name || 'Unknown',
                            email: c.email,
                            title: c.title,
                            url: c.url || scrapeUrl,
                            snippet: c.source,
                            source: 'Web Scraper',
                            instagram: c.instagram,
                            twitter: c.twitter,
                            tiktok: c.tiktok,
                            country: normalizeCountry(intent.filters?.country || artistContext?.location?.country)
                        }));

                        // Build rich response
                        let scrapeMsg = `**Scraped ${new URL(scrapeUrl).hostname}:**\n\n`;
                        if (scrapeResult.emails.length > 0) scrapeMsg += `📧 **Emails:** ${scrapeResult.emails.join(', ')}\n\n`;
                        const allSocial = Object.entries(scrapeResult.socialLinks).filter(([_, v]) => v.length > 0);
                        if (allSocial.length > 0) {
                            scrapeMsg += `🔗 **Social Links:**\n`;
                            for (const [platform, links] of allSocial) {
                                scrapeMsg += `- **${platform}:** ${links.join(', ')}\n`;
                            }
                        }
                        if (scrapeResult.contacts.length > 0) {
                            scrapeMsg += `\n👥 **Contacts Found:** ${scrapeResult.contacts.length}`;
                        }
                        intent.message = scrapeMsg;

                        suggestedNextSteps = [
                            'Draft a pitch to these contacts',
                            'Search for more pages to scrape',
                            'Enrich these contacts with LinkedIn data'
                        ];
                    } else {
                        logs.push(`❌ Scrape failed: ${scrapeResult.error}`);
                        intent.message = `I couldn't scrape that page (${scrapeResult.error}). The site might block automated requests. Try a Google search for their contact info instead.`;
                    }
                }

                // ─── LINKEDIN_SEARCH TRIGGER ───────────
                else if (intent.message && intent.message.startsWith('LINKEDIN_SEARCH:')) {
                    const liQuery = intent.message.replace('LINKEDIN_SEARCH:', '').trim();
                    logs.push(`💼 LinkedIn Search: "${liQuery}"`);
                    toolsUsed.push('linkedin_search');

                    const country = normalizeCountry(intent.filters?.country || artistContext?.location?.country);
                    const liResult = await searchLinkedInPipeline(liQuery, country);
                    logs.push(...liResult.logs);

                    leads = liResult.contacts.slice(0, 20).map((c, i) => ({
                        id: -(i + 1),
                        name: c.name,
                        title: c.title,
                        company: c.company,
                        url: c.url || '',
                        snippet: `${c.source} • Confidence: ${c.confidence}`,
                        source: c.source,
                        country
                    }));

                    const enrichedMessage = await enrichLeadsWithAI(leads, userMessage, validatedTier);
                    intent.message = enrichedMessage || `Found ${liResult.total} LinkedIn profiles${liResult.apiUsed ? ' via API' : ' via Google search'}.`;
                    suggestedNextSteps = ['Enrich a contact with email data', 'Draft a connection message', 'Deep search across all pipelines'];
                }

                // ─── APOLLO_SEARCH TRIGGER ─────────────
                else if (intent.message && intent.message.startsWith('APOLLO_SEARCH:')) {
                    const apolloQuery = intent.message.replace('APOLLO_SEARCH:', '').trim();
                    logs.push(`🔎 Apollo Search: "${apolloQuery}"`);
                    toolsUsed.push('apollo_search');

                    const country = normalizeCountry(intent.filters?.country || artistContext?.location?.country);
                    const apolloResult = await searchApollo(apolloQuery, country);
                    logs.push(...apolloResult.logs);

                    leads = apolloResult.contacts.slice(0, 20).map((c, i) => ({
                        id: -(i + 1),
                        name: c.name,
                        email: c.email,
                        title: c.title,
                        company: c.company,
                        url: c.url || '',
                        snippet: `${c.source} • Confidence: ${c.confidence}`,
                        source: c.source,
                        country
                    }));

                    const enrichedMessage = await enrichLeadsWithAI(leads, userMessage, validatedTier);
                    intent.message = enrichedMessage || `Found ${apolloResult.total} contacts${apolloResult.apiUsed ? ' with verified emails via Apollo API' : ' via Google fallback'}.`;
                    suggestedNextSteps = ['Draft a pitch to these contacts', 'Search LinkedIn for more', 'Create an email outreach sequence'];
                }

                // ─── SEARCH_REQUEST TRIGGER ────────────
                else if (intent.message && intent.message.startsWith('SEARCH_REQUEST:')) {
                    const query = intent.message.replace('SEARCH_REQUEST:', '').trim();

                    if (!webSearchEnabled) {
                        logs.push('🛑 Web search disabled.');
                        intent = {
                            ...intent,
                            action: 'clarify',
                            message: `Web search is off. I can answer with my knowledge, or toggle Web Search on for fresh sources.`
                        };
                    } else {
                        logs.push(`🔍 Searching: "${query}"...`);
                        toolsUsed.push('web_search');

                        const searchResults = await performSmartSearch(query, normalizeCountry(intent.filters?.country));
                        webResults = searchResults.map(r => ({
                            title: r.name,
                            url: r.url,
                            snippet: r.snippet,
                            source: r.source,
                            date: r.date
                        }));

                        // Re-prompt AI with results
                        const contextBlock = searchResults.map(r =>
                            `Title: ${r.name}\nSnippet: ${r.snippet}\nSource: ${r.source}`
                        ).join('\n\n');

                        logs.push(`✅ Found ${searchResults.length} results. Analyzing...`);
                        const toolPrompt = `SYSTEM: You searched for "${query}".
Results:
${contextBlock}

Now answer the user's original question: "${userMessage}".
Cite sources naturally. Write as Visio — warm, professional, strategic. Use markdown.`;

                        const finalIntent = await parseIntent(toolPrompt, conversationHistory, artistContext || undefined, validatedTier as any, 'chat', '');
                        intent = finalIntent;
                    }
                }

            } else {
                logs.push('⚠️ AI offline — basic mode');
                intent = parseBasicIntent(userMessage, lastSearchState);
            }
        }

        // ─── PORTAL GATE ───────────────────────────────
        const portalRequired = !artistContext && (mode === 'research' || intent.action === 'find_leads');
        if (portalRequired) {
            logs.push('🔒 Portal required for lead search.');
            return NextResponse.json({
                message: 'Complete your profile in Settings to unlock lead generation and research features.',
                leads: [],
                logs,
                intent: { ...intent, action: 'data_gap' },
                toolsUsed,
                suggestedNextSteps: ['Go to Settings and connect your Artist Portal'],
                meta: { total: 0, source: 'Portal Required' }
            }, { status: 403 });
        }

        // ─── ACTION HANDLERS ───────────────────────────
        switch (intent.action) {
            case 'find_leads':
            case 'search': {
                const country = normalizeCountry(intent.filters?.country);

                // Local database
                if (country === 'ZA' && leads.length === 0) {
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
                        logs.push(`✅ ${leads.length} leads from database`);
                    }
                }

                // Web search fallback
                if (leads.length === 0) {
                    const isLead = intent.action === 'find_leads';
                    logs.push(isLead ? '🎯 Searching for contacts...' : '🌐 Searching the web...');

                    const searchFn = isLead ? performLeadSearch : performSmartSearch;
                    const results = await searchFn(intent.filters?.searchTerm || userMessage, country);

                    if (isLead) {
                        const mappedLeads: LeadResponse[] = results.map(r => ({
                            ...r,
                            snippet: r.snippet || '',
                            source: r.source || 'Lead Search'
                        }));
                        leads = [...leads, ...mappedLeads];
                        toolsUsed.push('find_leads');
                        suggestedNextSteps = [
                            'Draft a pitch to these contacts',
                            'Search for more in a different market',
                            'Create an outreach email sequence'
                        ];
                    } else {
                        webResults = results.map(r => ({
                            title: r.name,
                            url: r.url,
                            snippet: r.snippet,
                            source: r.source,
                            date: r.date
                        }));
                    }
                    logs.push(`✅ Found ${results.length} results`);
                }
                break;
            }
            case 'data_gap': {
                logs.push('⚠️ Missing data — portal update needed');
                suggestedNextSteps = ['Update your Artist Portal with genre and location'];
                break;
            }
        }

        // Build final message
        let assistantMessage = intent.message || "Here are the results.";
        if ((intent.action === 'search' || intent.action === 'find_leads') && !intent.message) {
            const total = leads.length + webResults.length;
            assistantMessage = total > 0
                ? `Found ${total} results. Let me know if you want me to dig deeper or draft a pitch to any of these!`
                : `I couldn't find results for that query. Try refining your search or let me suggest a different approach.`;
        }

        return NextResponse.json({
            message: assistantMessage,
            leads,
            webResults,
            toolsUsed,
            suggestedNextSteps,
            logs,
            intent,
            meta: {
                total: leads.length + webResults.length,
                source: leads.some(l => l.source?.includes('Lead Search'))
                    ? 'Lead Search'
                    : leads.some(l => l.source?.includes('Database'))
                        ? 'Local DB'
                        : 'Web Search'
            }
        });

    } catch (error: any) {
        console.error('Agent Error:', error);
        return NextResponse.json({
            error: 'Internal processing error',
            message: 'Sorry, I hit a snag. Can you rephrase that?',
            leads: [],
            toolsUsed: [],
            suggestedNextSteps: ['Try rephrasing your question']
        }, { status: 500 });
    }
}
