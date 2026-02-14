import { NextRequest, NextResponse } from 'next/server';
import { parseIntent, ParsedIntent, createGeminiClient } from '@/lib/gemini';
import { classifyIntent, generateChatResponse, generateWithSearchResults, extractPortalData, IntentResult, hasClaudeKey } from '@/lib/claude';
import { getLeadsByCountry, filterLeads, getDatabaseSummary, DBLead, FilterOptions } from '@/lib/db';
import { performSmartSearch, performLeadSearch } from '@/lib/search';
import { getContextPack } from '@/lib/god-mode';
import { searchKnowledgeBase } from '@/lib/rag';
import { getToolInstruction, TOOL_REGISTRY } from '@/lib/tools';
import { performDeepSearch, searchApollo, searchLinkedInPipeline, getPipelineStatus, PipelineContact } from '@/lib/pipelines';
import { scrapeContactsFromUrl, scrapeMultipleUrls } from '@/lib/scraper';
import { searchAllSocials, flattenSocialResults } from '@/lib/social-search';
import { performSmartScrape, formatScrapeForContext } from '@/lib/smart-scrape';
import { detectAndExecuteAutomation, listAvailableAutomations } from '@/lib/automation-bank';
import { requireUser, isAdminUser } from '@/lib/api-auth';
import { getUserCredits, deductCredits, getCreditCost } from '@/lib/credits';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

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

function createRlsSupabaseClient(accessToken: string) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;

    return createClient(url, anonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
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

        const prompt = `You are V-Prai, the AI brain behind Visio Lead Gen. The user asked: "${userMessage}"

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
        const artistContextEnabled = typeof body.artistContextEnabled === 'boolean' ? body.artistContextEnabled : true;
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
            let userSubTier = 'artist';

            // Use user-scoped RLS reads (anon key + user access token or cookie session).
            // This avoids taking a hard dependency on SUPABASE_SERVICE_ROLE_KEY for the core chat flow.
            try {
                if (auth.accessToken) {
                    const supabaseRls = createRlsSupabaseClient(auth.accessToken);
                    if (supabaseRls) {
                        const { data } = await supabaseRls
                            .from('profiles')
                            .select('subscription_tier')
                            .eq('id', auth.user.id)
                            .maybeSingle();
                        if (data?.subscription_tier) userSubTier = data.subscription_tier;
                    }
                } else {
                    const supabase = await createSupabaseServerClient();
                    const { data } = await supabase
                        .from('profiles')
                        .select('subscription_tier')
                        .eq('id', auth.user.id)
                        .maybeSingle();
                    if (data?.subscription_tier) userSubTier = data.subscription_tier as string;
                }
            } catch {
                // Fall back to default tier if the profile read fails for any reason.
            }

            const allowedAiTiers = TIER_TO_AI_TIER[userSubTier] || ['instant'];
            validatedTier = allowedAiTiers.includes(tier) ? tier : allowedAiTiers[allowedAiTiers.length - 1];
        } else {
            validatedTier = tier; // Admins can use any tier
        }

        // 1. FETCH ARTIST CONTEXT (skip when user toggles it off)
        const artistContext = artistContextEnabled
            ? await getContextPack({ userId: auth.user.id, accessToken: auth.accessToken })
            : null;

        // 2. FETCH KNOWLEDGE BASE (RAG)
        let knowledgeContext = '';
        try {
            logs.push('🧠 Scanning V-Prai Brain...');
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
            const hasClaude = hasClaudeKey();
            const toolInstruction = getToolInstruction(activeTool);
            if (toolInstruction && activeTool !== 'web_search') {
                toolsUsed.push(activeTool);
            }

            if (hasClaude) {
                // ═══ CLAUDE-POWERED TWO-STAGE ARCHITECTURE ═══
                const keySource = process.env.AI_GATEWAY_API_KEY ? 'AI Gateway' : 'Direct Anthropic';
                console.log(`[V-Prai] Claude via ${keySource}, tier: ${validatedTier}, user: ${auth.user.id}`);

                // Stage 1: Classify intent (fast, cheap, deterministic)
                logs.push('🧠 V-Prai is thinking...');
                const intentResult: IntentResult = await classifyIntent(
                    userMessage,
                    conversationHistory,
                    artistContext,
                    validatedTier as 'instant' | 'business' | 'enterprise'
                );

                logs.push(`📋 Intent: ${intentResult.category} (${Math.round((intentResult.confidence || 0) * 100)}%)`);

                // ═══ AUTOMATION BANK CHECK ═══
                // Check if this message matches an automation trigger pattern.
                // Credit check FIRST, then execute — avoids burning API calls when user can't pay.
                const automationMatch = (() => {
                    const lower = userMessage.toLowerCase();
                    for (const skill of Object.values(
                        require('@/lib/automation-bank').AUTOMATION_REGISTRY
                    ) as { id: string; triggerPatterns: string[]; creditCost: number; name: string }[]) {
                        if (skill.triggerPatterns.some((p: string) => lower.includes(p.toLowerCase()))) {
                            return skill;
                        }
                    }
                    return null;
                })();

                if (automationMatch) {
                    const automationCost = getCreditCost(automationMatch.id) || automationMatch.creditCost || 3;

                    // Credit check BEFORE execution
                    if (automationCost > 0 && !isAdminUser(auth.user)) {
                        const balance = await getUserCredits(auth.user.id);
                        if (balance < automationCost) {
                            logs.push(`💳 Insufficient credits for ${automationMatch.name} (need ${automationCost}, have ${balance})`);
                            return NextResponse.json({
                                message: `This automation requires ${automationCost} credit${automationCost > 1 ? 's' : ''}, but you have ${balance}. Upgrade your plan for more credits!`,
                                leads: [],
                                webResults: [],
                                toolsUsed: [],
                                suggestedNextSteps: ['Upgrade your plan for more credits'],
                                logs,
                                intent: { action: 'clarify', filters: {}, message: `Insufficient credits for ${automationMatch.name}` }
                            });
                        }
                        // Deduct credits before executing the automation
                        await deductCredits(auth.user.id, automationCost, `automation: ${automationMatch.name}`);
                        logs.push(`💳 ${automationCost} credit${automationCost > 1 ? 's' : ''} used (${balance - automationCost} remaining)`);
                    }

                    // Now execute the automation (credits already secured)
                    const automationResult = await detectAndExecuteAutomation(userMessage, {
                        userMessage,
                        query: intentResult.searchQuery,
                        country: normalizeCountry(intentResult.filters?.country || artistContext?.location?.country),
                        genre: artistContext?.identity?.genre,
                        artistContext,
                        conversationHistory
                    });

                    if (automationResult) {
                        logs.push(`🤖 Automation executed: ${automationMatch.name}`);
                        logs.push(...automationResult.logs);

                        return NextResponse.json({
                            message: automationResult.summary,
                            leads: [],
                            webResults: [],
                            toolsUsed: [automationResult.data?.automationUsed || 'automation'],
                            suggestedNextSteps: automationResult.suggestedNextSteps || [],
                            logs,
                            intent: { action: 'automation_executed', filters: {}, message: automationResult.summary },
                            meta: {
                                automation: automationResult.data?.automationName,
                                automationData: automationResult.data
                            }
                        });
                    }
                }

                // Stage 2: Dispatch based on structured category
                switch (intentResult.category) {
                    case 'conversation':
                    case 'knowledge': {
                        // Pure conversational response — NO search triggered
                        const chatResponse = await generateChatResponse(
                            userMessage,
                            conversationHistory,
                            artistContext,
                            validatedTier as 'instant' | 'business' | 'enterprise',
                            knowledgeContext,
                            toolInstruction || undefined
                        );
                        intent = { action: 'clarify', filters: {}, message: chatResponse };
                        break;
                    }

                    case 'lead_generation': {
                        toolsUsed.push('find_leads');
                        const leadQuery = intentResult.searchQuery || userMessage;
                        const country = normalizeCountry(intentResult.filters?.country || artistContext?.location?.country);
                        logs.push(`🎯 Lead Finder activated: "${leadQuery}"`);

                        if (!webSearchEnabled) {
                            intent = { action: 'clarify', filters: {}, message: `I'd love to find those contacts for you, but web search is currently off. Toggle it on and I'll start searching!` };
                            break;
                        }

                        // Search local DB first
                        if (country === 'ZA') {
                            const dbLeads = getLeadsByCountry('ZA');
                            const filtered = filterLeads(dbLeads, { searchTerm: leadQuery, category: intentResult.filters?.category || undefined });
                            if (filtered.results.length > 0) {
                                leads = mapLeadsToResponse(filtered.results.slice(0, 20), 'South Africa');
                                logs.push(`📂 Found ${leads.length} in local database`);
                            }
                        }

                        // Web lead search
                        const webLeads = await performLeadSearch(leadQuery, country);
                        webResults = webLeads.map(r => ({ title: r.name, url: r.url, snippet: r.snippet, source: r.source, date: r.date }));
                        logs.push(`🌐 Found ${webLeads.length} web results`);

                        // Claude synthesizes results
                        const enrichedMsg = await generateWithSearchResults(userMessage, webLeads, validatedTier as any, artistContext);
                        intent = { action: 'find_leads', filters: { country }, message: enrichedMsg || `Found ${leads.length + webLeads.length} potential contacts.` };
                        suggestedNextSteps = ['Draft a pitch to these contacts', 'Search for more in a different market', 'Create an email outreach sequence'];
                        break;
                    }

                    case 'deep_search': {
                        toolsUsed.push('deep_search');
                        const deepQuery = intentResult.searchQuery || userMessage;
                        const country = normalizeCountry(intentResult.filters?.country || artistContext?.location?.country);
                        logs.push(`🚀 Deep Search activated: "${deepQuery}"`);

                        if (!webSearchEnabled) {
                            intent = { action: 'clarify', filters: {}, message: 'Deep Search needs web access. Toggle Web Search on to use all pipelines!' };
                            break;
                        }

                        const pipelineStatus = getPipelineStatus();
                        logs.push(`📡 Pipelines: Apify=${pipelineStatus.apify ? '🟢' : '⚪'} Apollo=${pipelineStatus.apollo ? '🟢' : '⚪'} LinkedIn=${pipelineStatus.linkedin ? '🟢' : '⚪'} ZoomInfo=${pipelineStatus.zoominfo ? '🟢' : '⚪'} PhantomBuster=${pipelineStatus.phantombuster ? '🟢' : '⚪'}`);

                        const deepResult = await performDeepSearch(deepQuery, country);
                        logs.push(...deepResult.logs);

                        leads = deepResult.contacts.slice(0, 30).map((c, i) => ({
                            id: -(i + 1), name: c.name, company: c.company, title: c.title, email: c.email,
                            url: c.url || '', snippet: `${c.source} • Confidence: ${c.confidence}`, source: c.source,
                            instagram: c.instagram, tiktok: c.tiktok, twitter: c.twitter, followers: c.followers, country
                        }));

                        const deepMsg = await generateWithSearchResults(userMessage, leads, validatedTier as any, artistContext);
                        intent = { action: 'find_leads', filters: { country }, message: deepMsg || `Deep Search found ${deepResult.total} unique contacts.` };
                        suggestedNextSteps = ['Draft a pitch to the top contacts', 'Scrape a specific result', 'Search social media profiles'];
                        break;
                    }

                    case 'web_search': {
                        if (!webSearchEnabled) {
                            const offlineResponse = await generateChatResponse(
                                userMessage, conversationHistory, artistContext,
                                validatedTier as any, knowledgeContext
                            );
                            intent = { action: 'clarify', filters: {}, message: offlineResponse + `\n\n> *Toggle Web Search on for fresh sources from the web.*` };
                            break;
                        }

                        toolsUsed.push('web_search');
                        const searchQuery = intentResult.searchQuery || userMessage;
                        const country = normalizeCountry(intentResult.filters?.country || artistContext?.location?.country);
                        logs.push(`🔍 Searching: "${searchQuery}"...`);

                        const searchResults = await performSmartSearch(searchQuery, country);
                        webResults = searchResults.map(r => ({ title: r.name, url: r.url, snippet: r.snippet, source: r.source, date: r.date }));
                        logs.push(`✅ Found ${searchResults.length} results. Analyzing...`);

                        const searchMsg = await generateWithSearchResults(userMessage, searchResults, validatedTier as any, artistContext);
                        intent = { action: 'search', filters: { country }, message: searchMsg || `Here's what I found for "${searchQuery}".` };
                        break;
                    }

                    case 'content_creation':
                    case 'strategy': {
                        toolsUsed.push(intentResult.category === 'content_creation' ? 'draft_pitch' : 'campaign_plan');
                        const contentToolPrompt = toolInstruction || getToolInstruction(
                            intentResult.category === 'content_creation' ? 'draft_pitch' : 'campaign_plan'
                        );
                        const contentResponse = await generateChatResponse(
                            userMessage, conversationHistory, artistContext,
                            validatedTier as 'instant' | 'business' | 'enterprise',
                            knowledgeContext, contentToolPrompt || undefined
                        );
                        intent = { action: 'clarify', filters: {}, message: contentResponse };
                        suggestedNextSteps = intentResult.category === 'content_creation'
                            ? ['Refine this draft', 'Create a follow-up email', 'Find contacts to pitch']
                            : ['Find contacts for this campaign', 'Create content for this strategy', 'Adjust the budget breakdown'];
                        break;
                    }

                    case 'smart_scrape': {
                        toolsUsed.push('smart_scrape');
                        const scrapeQuery = intentResult.searchQuery || userMessage;
                        logs.push(`🔬 Smart Scrape: "${scrapeQuery}"`);

                        if (!webSearchEnabled) {
                            intent = { action: 'clarify', filters: {}, message: 'Smart Scrape needs web access. Toggle Web Search on to research social media content!' };
                            break;
                        }

                        // Scrape YouTube, TikTok, Twitter in parallel
                        const scrapeResults = await performSmartScrape({
                            query: scrapeQuery,
                            platforms: ['youtube', 'tiktok', 'twitter'],
                            maxResults: 10,
                            sortBy: 'engagement',
                        });

                        const totalScraped = scrapeResults.reduce((s, r) => s + r.totalFound, 0);
                        logs.push(`✅ Scraped ${totalScraped} results across ${scrapeResults.length} platform(s)`);

                        // Synthesize with Claude
                        const scrapeContext = formatScrapeForContext(scrapeResults);
                        const scrapeResponse = await generateChatResponse(
                            userMessage,
                            conversationHistory,
                            artistContext,
                            validatedTier as 'instant' | 'business' | 'enterprise',
                            scrapeContext,
                            `You just performed a Smart Scrape research across YouTube, TikTok, and Twitter for "${scrapeQuery}". The research data is provided above.

Your job:
1. Summarize the key insights from top-performing content
2. Identify patterns in what works (hooks, formats, topics, hashtags)
3. Extract actionable advice the user can apply
4. Note audience sentiment from comments
5. Recommend specific next steps

Format with markdown tables for top content, bullet points for insights. End with yes/no action suggestions.`
                        );

                        intent = { action: 'search', filters: {}, message: scrapeResponse };
                        suggestedNextSteps = ['Research another topic', 'Draft content based on these insights', 'Find contacts mentioned in the research'];
                        break;
                    }

                    case 'portal_collection': {
                        // BETA: V-Prai collects artist profile data from conversation
                        logs.push('📝 [BETA] Collecting artist portal data...');
                        toolsUsed.push('portal_collection');

                        const extractionResult = await extractPortalData(
                            userMessage,
                            conversationHistory,
                            artistContext,
                        );

                        if (extractionResult && extractionResult.profileUpdates) {
                            // Save profile updates to Supabase
                            const updates = extractionResult.profileUpdates;
                            const nonNullUpdates = Object.fromEntries(
                                Object.entries(updates).filter(([, v]) => v !== null && v !== undefined)
                            );

                            if (Object.keys(nonNullUpdates).length > 0) {
                                try {
                                    const supabaseRls = auth.accessToken ? createRlsSupabaseClient(auth.accessToken) : null;
                                    if (supabaseRls) {
                                        // Build the profile update object
                                        const profilePatch: Record<string, any> = {};
                                        if (nonNullUpdates.name) profilePatch.artist_name = nonNullUpdates.name;
                                        if (nonNullUpdates.genre) profilePatch.genre = nonNullUpdates.genre;
                                        if (nonNullUpdates.description) profilePatch.description = nonNullUpdates.description;
                                        if (nonNullUpdates.city || nonNullUpdates.country) {
                                            profilePatch.location = JSON.stringify({
                                                city: nonNullUpdates.city || artistContext?.location?.city || '',
                                                country: nonNullUpdates.country || artistContext?.location?.country || '',
                                            });
                                        }
                                        if (nonNullUpdates.promotionalFocus) profilePatch.promotional_focus = nonNullUpdates.promotionalFocus;

                                        // Build socials object
                                        const socialsUpdate: Record<string, string> = {};
                                        if (nonNullUpdates.instagram) socialsUpdate.instagram = nonNullUpdates.instagram;
                                        if (nonNullUpdates.tiktok) socialsUpdate.tiktok = nonNullUpdates.tiktok;
                                        if (nonNullUpdates.twitter) socialsUpdate.twitter = nonNullUpdates.twitter;
                                        if (nonNullUpdates.youtube) socialsUpdate.youtube = nonNullUpdates.youtube;
                                        if (nonNullUpdates.spotify) socialsUpdate.website = nonNullUpdates.spotify;
                                        if (nonNullUpdates.website) socialsUpdate.website = nonNullUpdates.website;
                                        if (Object.keys(socialsUpdate).length > 0) {
                                            profilePatch.socials = JSON.stringify(socialsUpdate);
                                        }

                                        // Build metadata for extended fields
                                        const metadata: Record<string, any> = {};
                                        if (nonNullUpdates.instagramFollowers) metadata.instagramFollowers = nonNullUpdates.instagramFollowers;
                                        if (nonNullUpdates.monthlyListeners) metadata.monthlyListeners = nonNullUpdates.monthlyListeners;
                                        if (nonNullUpdates.similarArtists) metadata.similarArtists = nonNullUpdates.similarArtists;
                                        if (nonNullUpdates.careerHighlights) metadata.careerHighlights = nonNullUpdates.careerHighlights;
                                        if (nonNullUpdates.desiredCommunities) metadata.desiredCommunities = nonNullUpdates.desiredCommunities;
                                        if (nonNullUpdates.primaryGoal) metadata.primaryGoal = nonNullUpdates.primaryGoal;
                                        if (Object.keys(metadata).length > 0) {
                                            profilePatch.metadata = JSON.stringify(metadata);
                                        }

                                        if (Object.keys(profilePatch).length > 0) {
                                            await supabaseRls
                                                .from('profiles')
                                                .update(profilePatch)
                                                .eq('id', auth.user.id);
                                            logs.push(`✅ Updated ${Object.keys(nonNullUpdates).length} profile fields`);
                                        }
                                    }
                                } catch (e) {
                                    console.error('Portal collection save error:', e);
                                    logs.push('⚠️ Could not save profile data');
                                }
                            }

                            intent = { action: 'clarify', filters: {}, message: extractionResult.response };
                        } else {
                            // Fallback to regular conversation
                            const fallbackResponse = await generateChatResponse(
                                userMessage, conversationHistory, artistContext,
                                validatedTier as 'instant' | 'business' | 'enterprise',
                                knowledgeContext
                            );
                            intent = { action: 'clarify', filters: {}, message: fallbackResponse };
                        }
                        suggestedNextSteps = ['Tell me more about your music', 'Share your social media links', 'Start searching for contacts'];
                        break;
                    }

                    case 'clarify':
                    default: {
                        const clarifyResponse = await generateChatResponse(
                            userMessage, conversationHistory, artistContext,
                            validatedTier as 'instant' | 'business' | 'enterprise',
                            knowledgeContext
                        );
                        intent = { action: 'clarify', filters: {}, message: clarifyResponse };
                        break;
                    }
                }

            } else if (hasGemini) {
                // Fallback to Gemini with fixed error handling
                logs.push('🧠 V-Prai is thinking (Gemini)...');
                intent = await parseIntent(
                    toolInstruction ? `${toolInstruction}\n\nUser request: ${userMessage}` : userMessage,
                    conversationHistory,
                    artistContext || undefined,
                    validatedTier as 'instant' | 'business' | 'enterprise',
                    'chat',
                    knowledgeContext
                );
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

        // ─── CREDIT CHECK ─────────────────────────────
        // Map intent action to credit cost category
        const creditCategoryMap: Record<string, string> = {
            'find_leads': 'lead_search',
            'search': 'web_search',
            'deep_search': 'deep_search',
            'smart_scrape': 'smart_scrape',
        };
        const creditCategory = creditCategoryMap[intent.action] || 'chat_message';
        const creditCost = getCreditCost(creditCategory);

        if (creditCost > 0 && !isAdminUser(auth.user)) {
            const balance = await getUserCredits(auth.user.id);
            if (balance < creditCost) {
                logs.push(`💳 Insufficient credits (need ${creditCost}, have ${balance})`);
                return NextResponse.json({
                    message: `You need ${creditCost} credit${creditCost > 1 ? 's' : ''} for this action, but you have ${balance}. Upgrade your plan for more credits!`,
                    leads: [],
                    webResults: [],
                    toolsUsed,
                    suggestedNextSteps: ['Upgrade your plan for more credits'],
                    logs,
                    intent: { ...intent, action: 'clarify' },
                    meta: { total: 0, source: 'Credits' }
                });
            }
            // Deduct credits
            await deductCredits(auth.user.id, creditCost, `${intent.action}: ${userMessage.slice(0, 100)}`);
            logs.push(`💳 ${creditCost} credit${creditCost > 1 ? 's' : ''} used (${balance - creditCost} remaining)`);
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
