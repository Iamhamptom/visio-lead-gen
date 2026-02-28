import { NextRequest, NextResponse } from 'next/server';
import { parseIntent, ParsedIntent, createGeminiClient } from '@/lib/gemini';
import { classifyIntent, generateChatResponse, generateWithSearchResults, synthesizeQualifiedResults, reviewResultQuality, extractPortalData, IntentResult, IntentCategory, hasClaudeKey } from '@/lib/claude';
import { getLeadsByCountry, filterLeads, getDatabaseSummary, DBLead, FilterOptions } from '@/lib/db';
import { performSmartSearch, performLeadSearch } from '@/lib/search';
import { getContextPack } from '@/lib/god-mode';
import { searchKnowledgeBase } from '@/lib/rag';
import { getToolInstruction, TOOL_REGISTRY } from '@/lib/tools';
import { performDeepSearch, searchApollo, searchLinkedInPipeline, getPipelineStatus, PipelineContact } from '@/lib/pipelines';
import { performCascadingSearch, PipelineBrief } from '@/lib/lead-pipeline';
import { scrapeContactsFromUrl, scrapeMultipleUrls } from '@/lib/scraper';
import { searchAllSocials, flattenSocialResults } from '@/lib/social-search';
import { performSmartScrape, formatScrapeForContext } from '@/lib/smart-scrape';
import { qualifyLeads, formatQualifiedLeadsForSynthesis, QualifiedLead } from '@/lib/qualify-leads';
import { detectAndExecuteAutomation, listAvailableAutomations } from '@/lib/automation-bank';
import { requireUser, isAdminUser } from '@/lib/api-auth';
import { getUserCredits, deductCredits, getCreditCost } from '@/lib/credits';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getRelevantSkills, formatSkillsForPrompt } from '@/lib/knowledge-base';
import { getPatternInsights, formatPatternsForPrompt, recordSuccessfulSearch, recordLearningEvent } from '@/lib/learning-engine';
import { logApiError } from '@/lib/error-tracker';

// Maps subscription tiers to allowed AI tiers.
// 'standard' was removed — it didn't map to any model in Claude's MODEL_MAP or Gemini,
// so paying users on starter/artiste were silently getting the same AI (instant/Haiku) as free users.
const TIER_TO_AI_TIER: Record<string, string[]> = {
    'artist': ['instant'],
    'starter': ['instant', 'business'],
    'artiste': ['instant', 'business'],
    'starter_label': ['instant', 'business'],
    'label': ['instant', 'business', 'enterprise'],
    'agency': ['instant', 'business', 'enterprise'],
    'enterprise': ['instant', 'business', 'enterprise']
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

// ─── Result Relevance Filter ─────────────────────────
/**
 * Filters pipeline contacts for relevance based on the user's specific request.
 * Removes article titles, non-person entries, and results that don't match
 * the requested entity type, platform, or location.
 */
function filterContactsForRelevance(
    contacts: Array<{ name: string; email?: string; company?: string; title?: string; source: string; url?: string; instagram?: string; tiktok?: string; twitter?: string; linkedin?: string; followers?: string; country?: string; confidence: string }>,
    entityType: string,
    platform: string,
    specificLocation: string,
): typeof contacts {
    const entityLower = entityType.toLowerCase();
    const platformLower = platform.toLowerCase();
    const locationLower = specificLocation.toLowerCase();

    return contacts.filter(contact => {
        const name = (contact.name || '').trim();

        // 1. Skip entries with no name or names that are clearly article titles
        if (!name) return false;
        if (name.length > 80) return false; // Article titles tend to be very long
        // Detect article-like patterns: starts with verb phrases or contains "how to", "best of", etc.
        const articlePatterns = [
            /^(experience|discover|explore|learn|how to|the best|top \d+|best \d+|\d+ best|\d+ top|a guide|guide to|everything you|why you|what you|welcome to|introducing)/i,
            /\b(tips for|ways to|things to|reasons to|steps to|click here|subscribe|sign up|download)\b/i,
        ];
        if (articlePatterns.some(p => p.test(name))) return false;

        // 2. Skip entries named "Unknown" with no useful data
        if (name === 'Unknown' && !contact.email && !contact.instagram && !contact.tiktok && !contact.twitter) return false;

        // 3. Platform relevance: if user asked for TikTok specifically, prioritize contacts with TikTok data
        // Don't hard-filter (some valid contacts may not have the platform field set yet), but deprioritize
        // This is handled by scoring below

        // 4. Skip results that are clearly from a different domain (e.g., recipe blogs, tech sites)
        // when the user asked for a specific type
        if (entityLower && entityLower !== 'contacts' && entityLower !== 'leads') {
            const haystack = [name, contact.title || '', contact.company || '', contact.source || ''].join(' ').toLowerCase();
            // If the contact has NO relevance signal to the entity type, check if it's completely unrelated
            const hasEntitySignal = haystack.includes(entityLower) ||
                haystack.includes(entityLower.replace(/s$/, '')); // Handle plural: "dancers" → "dancer"
            const hasGenericSignal = /curator|journalist|blogger|dj|artist|producer|manager|label|music|entertainment|media/i.test(haystack);

            // If the contact has neither the specific entity type nor generic music signals,
            // and it's from a low-confidence source, filter it out
            if (!hasEntitySignal && !hasGenericSignal && contact.confidence === 'low') {
                return false;
            }
        }

        return true;
    }).sort((a, b) => {
        // Score-based sorting: most relevant first
        let scoreA = 0;
        let scoreB = 0;

        // Platform match bonus
        if (platformLower) {
            if (platformLower === 'tiktok') {
                if (a.tiktok) scoreA += 10;
                if (b.tiktok) scoreB += 10;
            } else if (platformLower === 'instagram') {
                if (a.instagram) scoreA += 10;
                if (b.instagram) scoreB += 10;
            } else if (platformLower === 'twitter') {
                if (a.twitter) scoreA += 10;
                if (b.twitter) scoreB += 10;
            } else if (platformLower === 'linkedin') {
                if (a.linkedin) scoreA += 10;
                if (b.linkedin) scoreB += 10;
            }
        }

        // Has email = higher confidence
        if (a.email) scoreA += 5;
        if (b.email) scoreB += 5;

        // Confidence scoring
        const confRank: Record<string, number> = { high: 6, medium: 3, low: 0 };
        scoreA += confRank[a.confidence] || 0;
        scoreB += confRank[b.confidence] || 0;

        // Location match bonus
        if (locationLower) {
            const aHaystack = [a.name, a.company || '', a.title || ''].join(' ').toLowerCase();
            const bHaystack = [b.name, b.company || '', b.title || ''].join(' ').toLowerCase();
            if (aHaystack.includes(locationLower)) scoreA += 4;
            if (bHaystack.includes(locationLower)) scoreB += 4;
        }

        // Entity type match bonus
        if (entityType) {
            const entLower = entityType.toLowerCase();
            const aHaystack = [a.name, a.title || '', a.company || ''].join(' ').toLowerCase();
            const bHaystack = [b.name, b.title || '', b.company || ''].join(' ').toLowerCase();
            if (aHaystack.includes(entLower) || aHaystack.includes(entLower.replace(/s$/, ''))) scoreA += 4;
            if (bHaystack.includes(entLower) || bHaystack.includes(entLower.replace(/s$/, ''))) scoreB += 4;
        }

        return scoreB - scoreA;
    });
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

        // Strip [Voice Mode] prefix so classifiers and search see clean text
        const rawMessage = message || (typeof body.query === 'string' ? body.query : '');
        const isVoiceMode = rawMessage.startsWith('[Voice Mode] ');
        const userMessage = isVoiceMode ? rawMessage.slice('[Voice Mode] '.length) : rawMessage;

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
        let creditsAlreadyCharged = false; // Track if credits were deducted in a switch case
        let intent: ParsedIntent;
        let leadRequestId: string | null = null;
        let leadMeta: { contactTypes: string[]; genre: string; markets: string[] } | null = null;

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
            const resolvePaidTier = async (client: any): Promise<string | null> => {
                try {
                    const { data } = await client
                        .from('invoices')
                        .select('tier')
                        .eq('user_id', auth.user.id)
                        .eq('status', 'paid')
                        .order('paid_at', { ascending: false })
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    return typeof data?.tier === 'string' ? data.tier : null;
                } catch {
                    return null;
                }
            };

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

                        if (userSubTier === 'artist') {
                            const paidTier = await resolvePaidTier(supabaseRls);
                            if (paidTier) {
                                userSubTier = paidTier;
                                await supabaseRls
                                    .from('profiles')
                                    .update({
                                        subscription_tier: paidTier,
                                        subscription_status: 'active',
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('id', auth.user.id);
                            }
                        }
                    }
                } else {
                    const supabase = await createSupabaseServerClient();
                    const { data } = await supabase
                        .from('profiles')
                        .select('subscription_tier')
                        .eq('id', auth.user.id)
                        .maybeSingle();
                    if (data?.subscription_tier) userSubTier = data.subscription_tier as string;

                    if (userSubTier === 'artist') {
                        const paidTier = await resolvePaidTier(supabase);
                        if (paidTier) {
                            userSubTier = paidTier;
                            await supabase
                                .from('profiles')
                                .update({
                                    subscription_tier: paidTier,
                                    subscription_status: 'active',
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', auth.user.id);
                        }
                    }
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

        // 2. FETCH KNOWLEDGE BASE (RAG + Skills + Pattern Memory)
        let knowledgeContext = '';
        try {
            logs.push('🧠 Scanning V-Prai Brain...');

            // a) Vector search (existing RAG)
            const relevantChunks = await searchKnowledgeBase(userMessage, 3);
            if (relevantChunks && relevantChunks.length > 0) {
                knowledgeContext = relevantChunks.map(c =>
                    `[Internal Knowledge - ${c.category}]: ${c.content}`
                ).join('\n\n');
                logs.push(`✅ Found ${relevantChunks.length} strategies`);
            } else {
                logs.push('⚪ Using general knowledge');
            }

            // b) Skill-based knowledge (from growing knowledge base)
            const genre = artistContext?.identity?.genre || undefined;
            const country = artistContext?.location?.country || undefined;
            const skills = await getRelevantSkills(genre, country, undefined, 3);
            if (skills.length > 0) {
                const skillsPrompt = formatSkillsForPrompt(skills);
                knowledgeContext = knowledgeContext
                    ? `${knowledgeContext}\n\n${skillsPrompt}`
                    : skillsPrompt;
                logs.push(`📚 Loaded ${skills.length} learned skills`);
            }

            // c) Pattern insights (from reinforcement learning)
            const patternInsight = await getPatternInsights({ genre, country });
            if (patternInsight) {
                const patternPrompt = formatPatternsForPrompt(patternInsight);
                if (patternPrompt) {
                    knowledgeContext = knowledgeContext
                        ? `${knowledgeContext}\n\n${patternPrompt}`
                        : patternPrompt;
                    logs.push(`🔄 Applied pattern insight (${Math.round(patternInsight.confidence * 100)}% confidence)`);
                }
            }
        } catch (e) {
            console.error('RAG/Knowledge Error', e);
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
                // Only trigger automations when Claude's intent classification agrees this is
                // an actionable request (not just conversation/knowledge). Without this gate,
                // casual messages like "what's trending?" would burn 3 credits on a scrape
                // even though Claude correctly classified it as a knowledge question.
                const AUTOMATION_ELIGIBLE_INTENTS: IntentCategory[] = [
                    'lead_generation', 'deep_search', 'web_search', 'smart_scrape'
                ];
                const automationMatch = AUTOMATION_ELIGIBLE_INTENTS.includes(intentResult.category)
                    ? (() => {
                        const lower = userMessage.toLowerCase();
                        for (const skill of Object.values(
                            require('@/lib/automation-bank').AUTOMATION_REGISTRY
                        ) as { id: string; triggerPatterns: string[]; creditCost: number; name: string }[]) {
                            if (skill.triggerPatterns.some((p: string) => lower.includes(p.toLowerCase()))) {
                                return skill;
                            }
                        }
                        return null;
                    })()
                    : null;

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

                        // Synthesize raw automation results through V-Prai for a strategic response
                        let synthesizedMessage = automationResult.summary;
                        try {
                            const automationContext = typeof automationResult.data === 'object'
                                ? JSON.stringify(automationResult.data).slice(0, 3000)
                                : String(automationResult.data || '').slice(0, 3000);

                            synthesizedMessage = await generateChatResponse(
                                userMessage,
                                conversationHistory,
                                artistContext,
                                validatedTier as 'instant' | 'business' | 'enterprise',
                                `## AUTOMATION RESULTS (${automationMatch.name})\n${automationContext}\n\nSummary: ${automationResult.summary}`,
                                `You just executed the "${automationMatch.name}" automation for the user. The raw results are above. Synthesize into a strategic, actionable response with markdown tables where appropriate. End with 2-3 specific next steps.`,
                                isVoiceMode
                            );
                        } catch (e) {
                            console.error('Automation synthesis failed, using raw summary:', e);
                        }

                        return NextResponse.json({
                            message: synthesizedMessage,
                            leads: [],
                            webResults: [],
                            toolsUsed: [automationResult.data?.automationUsed || 'automation'],
                            suggestedNextSteps: automationResult.suggestedNextSteps || [],
                            logs,
                            intent: { action: 'automation_executed', filters: {}, message: synthesizedMessage },
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
                            toolInstruction || undefined,
                            isVoiceMode
                        );
                        intent = { action: 'clarify', filters: {}, message: chatResponse };
                        break;
                    }

                    case 'lead_generation': {
                        toolsUsed.push('find_leads');
                        const leadQuery = intentResult.searchQuery || userMessage;
                        const country = normalizeCountry(intentResult.filters?.country || artistContext?.location?.country);

                        // Respect the user's requested count from queryPlan, with sensible bounds
                        const queryPlan = intentResult.queryPlan || {};
                        const userRequestedCount = queryPlan.targetCount;
                        const targetCount = userRequestedCount
                            ? Math.min(Math.max(userRequestedCount, 1), 100) // Clamp between 1 and 100
                            : 20; // Sensible default instead of 100
                        logs.push(`🎯 Lead Finder activated: "${leadQuery}" (target: ${targetCount}${userRequestedCount ? ` — user requested ${userRequestedCount}` : ''})`);

                        if (!webSearchEnabled) {
                            intent = { action: 'clarify', filters: {}, message: `I'd love to find those contacts for you, but web search is currently off. Toggle it on and I'll start searching!` };
                            break;
                        }

                        // Credit pre-check BEFORE running any searches to avoid wasting API calls
                        const leadCreditCost = getCreditCost('lead_generation');
                        if (leadCreditCost > 0 && !isAdminUser(auth.user)) {
                            const preBalance = await getUserCredits(auth.user.id);
                            if (preBalance < leadCreditCost) {
                                logs.push(`💳 Insufficient credits (need ${leadCreditCost}, have ${preBalance})`);
                                intent = {
                                    action: 'clarify', filters: {},
                                    message: `You need ${leadCreditCost} credit${leadCreditCost > 1 ? 's' : ''} for a lead search, but you have ${preBalance}. Upgrade your plan for more credits!`
                                };
                                suggestedNextSteps = ['Upgrade your plan for more credits'];
                                break;
                            }
                        }

                        // Log lead request to admin dashboard
                        try {
                            const { data: reqData } = await supabaseAdmin
                                .from('lead_requests')
                                .insert({
                                    user_id: auth.user.id,
                                    query: leadQuery,
                                    contact_types: intentResult.filters?.category ? [intentResult.filters.category] : [],
                                    markets: [country],
                                    genre: artistContext?.identity?.genre || '',
                                    target_count: targetCount,
                                    status: 'in_progress',
                                })
                                .select('id')
                                .single();
                            leadRequestId = reqData?.id || null;
                            logs.push('📋 Lead request logged to admin');
                        } catch (e) {
                            console.error('Failed to log lead request:', e);
                        }

                        // Build contact types from queryPlan entity type, then intent category, then defaults
                        const leadContactTypes = queryPlan.entityType
                            ? [queryPlan.entityType]
                            : intentResult.filters?.category
                                ? [intentResult.filters.category]
                                : ['curators', 'journalists', 'bloggers', 'DJs', 'A&R'];
                        const leadGenre = queryPlan.niche || artistContext?.identity?.genre || '';
                        const leadMarkets = [country];
                        leadMeta = { contactTypes: leadContactTypes, genre: leadGenre, markets: leadMarkets };

                        const pipelineStatus = getPipelineStatus();
                        logs.push(`📡 Pipelines: Apollo=${pipelineStatus.apollo ? '🟢' : '⚪'} LinkedIn=${pipelineStatus.linkedin ? '🟢' : '⚪'} ZoomInfo=${pipelineStatus.zoominfo ? '🟢' : '⚪'}`);

                        // Build a more specific search query incorporating location and platform
                        let refinedQuery = leadQuery;
                        if (queryPlan.specificLocation && !leadQuery.toLowerCase().includes(queryPlan.specificLocation.toLowerCase())) {
                            refinedQuery = `${refinedQuery} ${queryPlan.specificLocation}`;
                        }

                        // Use cascading search (Tier 1 quick pass for fast initial results)
                        const brief: PipelineBrief = {
                            contactTypes: leadContactTypes,
                            markets: leadMarkets,
                            genre: leadGenre,
                            query: refinedQuery,
                            targetCount,
                            searchDepth: 'quick',
                            preferredPlatform: queryPlan.platform || undefined,
                            specificLocation: queryPlan.specificLocation || undefined,
                        };

                        const cascadeResult = await performCascadingSearch(brief);
                        logs.push(...cascadeResult.logs);

                        // Filter results for relevance before qualification
                        const filteredContacts = filterContactsForRelevance(
                            cascadeResult.contacts,
                            queryPlan.entityType || '',
                            queryPlan.platform || '',
                            queryPlan.specificLocation || ''
                        );

                        logs.push(`📊 ${filteredContacts.length} contacts after relevance filter (from ${cascadeResult.total} raw)`);

                        // === QUALIFICATION PIPELINE ===
                        // Verify profiles via Apify scrapers: check followers, activity, bio, location, niche
                        const hasApifyToken = !!process.env.APIFY_API_TOKEN;
                        let qualifiedLeads: QualifiedLead[] = [];
                        let qualifiedContext = '';

                        if (hasApifyToken && filteredContacts.length > 0) {
                            logs.push('🔍 Qualifying leads — verifying profiles, followers, activity...');

                            const qualResult = await qualifyLeads(filteredContacts, {
                                entityType: queryPlan.entityType || '',
                                niche: queryPlan.niche || leadGenre,
                                targetLocation: queryPlan.specificLocation || '',
                                platform: queryPlan.platform || '',
                                maxToQualify: Math.min(targetCount + 5, 15), // Qualify slightly more than needed
                            });
                            qualifiedLeads = qualResult.qualified;
                            logs.push(...qualResult.logs);

                            // Build qualified context for AI synthesis
                            qualifiedContext = formatQualifiedLeadsForSynthesis(
                                qualifiedLeads.slice(0, targetCount)
                            );
                        } else {
                            // No Apify — use basic filtered contacts
                            qualifiedLeads = filteredContacts.slice(0, targetCount).map(c => ({
                                ...c,
                                isActive: false,
                                qualityScore: c.confidence === 'high' ? 40 : c.confidence === 'medium' ? 25 : 10,
                                qualityReasons: ['Basic scoring (profile verification unavailable)'],
                                wasVerified: false,
                            }));
                        }

                        // Map qualified leads to response format
                        leads = qualifiedLeads.slice(0, targetCount).map((c, i) => ({
                            id: -(i + 1),
                            name: c.name,
                            company: c.company,
                            title: c.title,
                            email: c.email,
                            url: c.url || '',
                            snippet: c.wasVerified
                                ? `Score: ${c.qualityScore}/100 | ${c.qualityReasons.slice(0, 2).join(', ')} | ${c.source}`
                                : `${c.source} | Confidence: ${c.confidence}`,
                            source: c.source,
                            instagram: c.instagram,
                            tiktok: c.tiktok,
                            twitter: c.twitter,
                            followers: c.followers,
                            country
                        }));

                        const verifiedCount = qualifiedLeads.filter(q => q.wasVerified).length;
                        const activeCount = qualifiedLeads.filter(q => q.isActive).length;
                        logs.push(`✅ Total: ${leads.length} qualified contacts (${verifiedCount} verified, ${activeCount} active)`);

                        // === AI SELF-REVIEW ===
                        // Quick check: are these results actually useful?
                        const reviewData = qualifiedLeads.slice(0, 15).map(l => ({
                            name: l.name, source: l.source, email: l.email,
                            tiktok: l.tiktok, instagram: l.instagram,
                            followers: l.followers, qualityScore: l.qualityScore,
                        }));
                        const review = await reviewResultQuality(userMessage, reviewData);
                        logs.push(`🔎 Self-review: ${review.verdict} (${review.relevant} relevant, ${review.irrelevant} irrelevant)`);

                        // Update admin log with completion status + persist results
                        if (leadRequestId) {
                            try {
                                await supabaseAdmin
                                    .from('lead_requests')
                                    .update({
                                        status: 'completed',
                                        results_count: leads.length,
                                        results: leads,
                                        completed_at: new Date().toISOString(),
                                    })
                                    .eq('id', leadRequestId);
                            } catch (e) {
                                console.error('Failed to update lead request status:', e);
                            }
                        }

                        // === INTELLIGENT SYNTHESIS ===
                        // Use qualified synthesis if we have verified data, otherwise fall back
                        let enrichedMsg: string;
                        if (qualifiedContext && verifiedCount > 0) {
                            enrichedMsg = await synthesizeQualifiedResults(
                                userMessage, qualifiedContext,
                                validatedTier as any, artistContext,
                                { total: leads.length, verified: verifiedCount, active: activeCount, avgScore: qualifiedLeads.length > 0 ? Math.round(qualifiedLeads.reduce((s, q) => s + q.qualityScore, 0) / qualifiedLeads.length) : 0 },
                                isVoiceMode
                            );
                        } else {
                            const allResultsForSynthesis = leads.map(l => ({
                                name: l.name, url: l.url, snippet: l.snippet,
                                source: l.source, email: l.email,
                                instagram: l.instagram, twitter: l.twitter, tiktok: l.tiktok
                            }));
                            enrichedMsg = await generateWithSearchResults(userMessage, allResultsForSynthesis, validatedTier as any, artistContext, isVoiceMode);
                        }

                        // If self-review says poor quality, prepend an honest note
                        if (review.verdict === 'poor' && review.recommendation) {
                            enrichedMsg = `> Note: I found limited quality matches for your specific request. ${review.recommendation}\n\n${enrichedMsg}`;
                        }

                        intent = {
                            action: 'find_leads',
                            filters: { country },
                            message: enrichedMsg || `Found ${leads.length} contacts across all sources.`
                        };
                        // Store totalAvailable for canLoadMore calculation (not in ParsedIntent type)
                        (intent as any)._totalAvailable = cascadeResult.total;
                        suggestedNextSteps = ['Draft a pitch to these contacts', 'Load more contacts', 'Export to CSV', 'Search for more in a different market'];
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

                        // Credit pre-check BEFORE running multi-pipeline search (Apollo, LinkedIn, etc.)
                        const deepCreditCost = getCreditCost('deep_search');
                        if (deepCreditCost > 0 && !isAdminUser(auth.user)) {
                            const deepBalance = await getUserCredits(auth.user.id);
                            if (deepBalance < deepCreditCost) {
                                logs.push(`💳 Insufficient credits (need ${deepCreditCost}, have ${deepBalance})`);
                                intent = {
                                    action: 'clarify', filters: {},
                                    message: `Deep Search requires ${deepCreditCost} credits, but you have ${deepBalance}. Upgrade your plan for more credits!`
                                };
                                suggestedNextSteps = ['Upgrade your plan for more credits'];
                                break;
                            }
                            await deductCredits(auth.user.id, deepCreditCost, `deep_search: ${userMessage.slice(0, 100)}`);
                            creditsAlreadyCharged = true;
                            logs.push(`💳 ${deepCreditCost} credits used (${deepBalance - deepCreditCost} remaining)`);
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

                        const deepMsg = await generateWithSearchResults(userMessage, leads, validatedTier as any, artistContext, isVoiceMode);
                        intent = { action: 'find_leads', filters: { country }, message: deepMsg || `Deep Search found ${deepResult.total} unique contacts.` };
                        suggestedNextSteps = ['Draft a pitch to the top contacts', 'Scrape a specific result', 'Search social media profiles'];
                        break;
                    }

                    case 'web_search': {
                        if (!webSearchEnabled) {
                            const offlineResponse = await generateChatResponse(
                                userMessage, conversationHistory, artistContext,
                                validatedTier as any, knowledgeContext, undefined, isVoiceMode
                            );
                            intent = { action: 'clarify', filters: {}, message: offlineResponse + (isVoiceMode ? '' : `\n\n> *Toggle Web Search on for fresh sources from the web.*`) };
                            break;
                        }

                        // Credit pre-check BEFORE running Serper API + Claude synthesis
                        const wsCreditCost = getCreditCost('web_search');
                        if (wsCreditCost > 0 && !isAdminUser(auth.user)) {
                            const wsBalance = await getUserCredits(auth.user.id);
                            if (wsBalance < wsCreditCost) {
                                logs.push(`💳 Insufficient credits (need ${wsCreditCost}, have ${wsBalance})`);
                                intent = {
                                    action: 'clarify', filters: {},
                                    message: `Web search requires ${wsCreditCost} credit, but you have ${wsBalance}. Upgrade your plan for more credits!`
                                };
                                suggestedNextSteps = ['Upgrade your plan for more credits'];
                                break;
                            }
                            await deductCredits(auth.user.id, wsCreditCost, `web_search: ${userMessage.slice(0, 100)}`);
                            creditsAlreadyCharged = true;
                            logs.push(`💳 ${wsCreditCost} credit used (${wsBalance - wsCreditCost} remaining)`);
                        }

                        toolsUsed.push('web_search');
                        const searchQuery = intentResult.searchQuery || userMessage;
                        const country = normalizeCountry(intentResult.filters?.country || artistContext?.location?.country);
                        logs.push(`🔍 Searching: "${searchQuery}"...`);

                        const searchResults = await performSmartSearch(searchQuery, country);
                        webResults = searchResults.map(r => ({ title: r.name, url: r.url, snippet: r.snippet, source: r.source, date: r.date }));
                        logs.push(`✅ Found ${searchResults.length} results. Analyzing...`);

                        const searchMsg = await generateWithSearchResults(userMessage, searchResults, validatedTier as any, artistContext, isVoiceMode);
                        intent = { action: 'search', filters: { country }, message: searchMsg || `Here's what I found for "${searchQuery}".` };
                        break;
                    }

                    case 'content_creation':
                    case 'strategy': {
                        // Credit pre-check BEFORE generating content/strategy (previously uncharged)
                        const contentCreditCategory = intentResult.category === 'content_creation'
                            ? 'content_creation' : 'strategy';
                        const contentCreditCost = getCreditCost(contentCreditCategory);
                        if (contentCreditCost > 0 && !isAdminUser(auth.user)) {
                            const preBalance = await getUserCredits(auth.user.id);
                            if (preBalance < contentCreditCost) {
                                logs.push(`💳 Insufficient credits (need ${contentCreditCost}, have ${preBalance})`);
                                intent = {
                                    action: 'clarify', filters: {},
                                    message: `This requires ${contentCreditCost} credit${contentCreditCost > 1 ? 's' : ''}, but you have ${preBalance}. Upgrade your plan for more credits!`
                                };
                                suggestedNextSteps = ['Upgrade your plan for more credits'];
                                break;
                            }
                            await deductCredits(auth.user.id, contentCreditCost, `${contentCreditCategory}: ${userMessage.slice(0, 100)}`);
                            creditsAlreadyCharged = true;
                            logs.push(`💳 ${contentCreditCost} credit${contentCreditCost > 1 ? 's' : ''} used (${preBalance - contentCreditCost} remaining)`);
                        }

                        toolsUsed.push(intentResult.category === 'content_creation' ? 'draft_pitch' : 'campaign_plan');
                        const contentToolPrompt = toolInstruction || getToolInstruction(
                            intentResult.category === 'content_creation' ? 'draft_pitch' : 'campaign_plan'
                        );
                        const contentResponse = await generateChatResponse(
                            userMessage, conversationHistory, artistContext,
                            validatedTier as 'instant' | 'business' | 'enterprise',
                            knowledgeContext, contentToolPrompt || undefined, isVoiceMode
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

                        // Credit pre-check BEFORE running Apify scrapes
                        const scrapeCreditCost = getCreditCost('smart_scrape');
                        if (scrapeCreditCost > 0 && !isAdminUser(auth.user)) {
                            const scrapeBalance = await getUserCredits(auth.user.id);
                            if (scrapeBalance < scrapeCreditCost) {
                                logs.push(`💳 Insufficient credits (need ${scrapeCreditCost}, have ${scrapeBalance})`);
                                intent = {
                                    action: 'clarify', filters: {},
                                    message: `Smart Scrape requires ${scrapeCreditCost} credits, but you have ${scrapeBalance}. Upgrade your plan for more credits!`
                                };
                                suggestedNextSteps = ['Upgrade your plan for more credits'];
                                break;
                            }
                            await deductCredits(auth.user.id, scrapeCreditCost, `smart_scrape: ${userMessage.slice(0, 100)}`);
                            creditsAlreadyCharged = true;
                            logs.push(`💳 ${scrapeCreditCost} credits used (${scrapeBalance - scrapeCreditCost} remaining)`);
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

Format with markdown tables for top content, bullet points for insights. End with yes/no action suggestions.`,
                            isVoiceMode
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
                                        // Build profile patch for artist_profiles table
                                        // Schema: name, genre, bio, socials (JSONB), metrics (JSONB)
                                        const profilePatch: Record<string, any> = {};
                                        if (nonNullUpdates.name) profilePatch.name = nonNullUpdates.name;
                                        if (nonNullUpdates.genre) profilePatch.genre = nonNullUpdates.genre;
                                        if (nonNullUpdates.description) profilePatch.bio = nonNullUpdates.description;

                                        // Build socials JSONB (god-mode.ts reads socials.location, socials.goals, socials.instagram, etc.)
                                        const socialsUpdate: Record<string, any> = {};
                                        if (nonNullUpdates.instagram) socialsUpdate.instagram = nonNullUpdates.instagram;
                                        if (nonNullUpdates.tiktok) socialsUpdate.tiktok = nonNullUpdates.tiktok;
                                        if (nonNullUpdates.twitter) socialsUpdate.twitter = nonNullUpdates.twitter;
                                        if (nonNullUpdates.youtube) socialsUpdate.youtube = nonNullUpdates.youtube;
                                        if (nonNullUpdates.spotify) socialsUpdate.spotify = nonNullUpdates.spotify;
                                        if (nonNullUpdates.website) socialsUpdate.website = nonNullUpdates.website;
                                        if (nonNullUpdates.city || nonNullUpdates.country) {
                                            socialsUpdate.location = {
                                                city: nonNullUpdates.city || artistContext?.location?.city || '',
                                                country: nonNullUpdates.country || artistContext?.location?.country || '',
                                            };
                                        }
                                        if (nonNullUpdates.primaryGoal) {
                                            socialsUpdate.goals = {
                                                primaryGoal: nonNullUpdates.primaryGoal,
                                                ...(nonNullUpdates.promotionalFocus ? { promotionalFocus: nonNullUpdates.promotionalFocus } : {}),
                                            };
                                        }
                                        if (Object.keys(socialsUpdate).length > 0) {
                                            profilePatch.socials = socialsUpdate; // JSONB column — pass object directly
                                        }

                                        // Build metrics JSONB for numeric/extended data
                                        const metricsUpdate: Record<string, any> = {};
                                        if (nonNullUpdates.instagramFollowers) metricsUpdate.instagramFollowers = nonNullUpdates.instagramFollowers;
                                        if (nonNullUpdates.monthlyListeners) metricsUpdate.monthlyListeners = nonNullUpdates.monthlyListeners;
                                        if (nonNullUpdates.similarArtists) metricsUpdate.similarArtists = nonNullUpdates.similarArtists;
                                        if (nonNullUpdates.careerHighlights) metricsUpdate.careerHighlights = nonNullUpdates.careerHighlights;
                                        if (nonNullUpdates.desiredCommunities) metricsUpdate.desiredCommunities = nonNullUpdates.desiredCommunities;
                                        if (Object.keys(metricsUpdate).length > 0) {
                                            profilePatch.metrics = metricsUpdate;
                                        }

                                        if (Object.keys(profilePatch).length > 0) {
                                            // Upsert into artist_profiles (not profiles!) so data
                                            // appears in getContextPack() on the next message.
                                            await supabaseRls
                                                .from('artist_profiles')
                                                .upsert({
                                                    user_id: auth.user.id,
                                                    ...profilePatch,
                                                    updated_at: new Date().toISOString(),
                                                }, { onConflict: 'user_id' });
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
                                knowledgeContext, undefined, isVoiceMode
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
                            knowledgeContext, undefined, isVoiceMode
                        );
                        intent = { action: 'clarify', filters: {}, message: clarifyResponse };
                        break;
                    }
                }

            } else if (hasGemini) {
                // Gemini-powered chat — uses parseIntent which now detects tool triggers
                logs.push('🧠 V-Prai is thinking (Gemini)...');
                intent = await parseIntent(
                    toolInstruction ? `${toolInstruction}\n\nUser request: ${userMessage}` : userMessage,
                    conversationHistory,
                    artistContext || undefined,
                    validatedTier as 'instant' | 'business' | 'enterprise',
                    'chat',
                    knowledgeContext
                );

                // ═══ AUTOMATION BANK CHECK (Gemini path) ═══
                // Only trigger automations when Gemini detected an actionable intent
                // (find_leads or search), not for plain conversation (clarify).
                const GEMINI_AUTOMATION_ELIGIBLE: ParsedIntent['action'][] = ['find_leads', 'search'];
                if (GEMINI_AUTOMATION_ELIGIBLE.includes(intent.action)) {
                    const geminiAutomationMatch = (() => {
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

                    if (geminiAutomationMatch) {
                        const automationCost = getCreditCost(geminiAutomationMatch.id) || geminiAutomationMatch.creditCost || 3;

                        if (automationCost > 0 && !isAdminUser(auth.user)) {
                            const balance = await getUserCredits(auth.user.id);
                            if (balance < automationCost) {
                                logs.push(`💳 Insufficient credits for ${geminiAutomationMatch.name} (need ${automationCost}, have ${balance})`);
                                return NextResponse.json({
                                    message: `This automation requires ${automationCost} credit${automationCost > 1 ? 's' : ''}, but you have ${balance}. Upgrade your plan for more credits!`,
                                    leads: [], webResults: [], toolsUsed: [],
                                    suggestedNextSteps: ['Upgrade your plan for more credits'],
                                    logs,
                                    intent: { action: 'clarify', filters: {}, message: `Insufficient credits for ${geminiAutomationMatch.name}` }
                                });
                            }
                            await deductCredits(auth.user.id, automationCost, `automation: ${geminiAutomationMatch.name}`);
                            logs.push(`💳 ${automationCost} credit${automationCost > 1 ? 's' : ''} used (${balance - automationCost} remaining)`);
                        }

                        const automationResult = await detectAndExecuteAutomation(userMessage, {
                            userMessage,
                            query: intent.filters?.searchTerm || userMessage,
                            country: normalizeCountry(intent.filters?.country || artistContext?.location?.country),
                            genre: artistContext?.identity?.genre,
                            artistContext,
                            conversationHistory
                        });

                        if (automationResult) {
                            logs.push(`🤖 Automation executed: ${geminiAutomationMatch.name}`);
                            logs.push(...automationResult.logs);

                            // Synthesize automation results through Gemini for V-Prai persona
                            let synthesizedMessage = automationResult.summary;
                            try {
                                const geminiModel = createGeminiClient(validatedTier as any);
                                const automationContext = typeof automationResult.data === 'object'
                                    ? JSON.stringify(automationResult.data).slice(0, 3000)
                                    : String(automationResult.data || '').slice(0, 3000);
                                const synthResult = await geminiModel.generateContent(
                                    `You are V-Prai, the AI publicist on Visio Lead Gen. You just executed the "${geminiAutomationMatch.name}" automation.\n\nRaw results:\n${automationContext}\n\nSummary: ${automationResult.summary}\n\nUser's original request: "${userMessage}"\n\nSynthesize these results into a strategic, actionable response with V-Prai's publicist energy. Use markdown tables where appropriate. End with 2-3 specific next steps.`
                                );
                                synthesizedMessage = synthResult.response.text().trim() || synthesizedMessage;
                            } catch (e) {
                                console.error('Automation synthesis failed, using raw summary:', e);
                            }

                            return NextResponse.json({
                                message: synthesizedMessage,
                                leads: [], webResults: [],
                                toolsUsed: [automationResult.data?.automationUsed || 'automation'],
                                suggestedNextSteps: automationResult.suggestedNextSteps || [],
                                logs,
                                intent: { action: 'automation_executed', filters: {}, message: synthesizedMessage },
                                meta: { automation: automationResult.data?.automationName, automationData: automationResult.data }
                            });
                        }
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

        // ─── CREDIT CHECK ─────────────────────────────
        // Skip if credits were already deducted in a switch case above (Claude path).
        // This bottom check handles the Gemini/basic fallback paths where credits
        // haven't been pre-deducted yet.
        if (!creditsAlreadyCharged) {
            const creditCategoryMap: Record<string, string> = {
                'find_leads': 'lead_generation',   // 2 credits, not deep_search (5)
                'search': 'web_search',            // 1 credit
                'deep_search': 'deep_search',      // 5 credits
                'smart_scrape': 'smart_scrape',    // 3 credits
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
            canLoadMore: ((intent as any)?._totalAvailable || 0) > leads.length,
            leadRequestId,
            leadMeta,
            meta: {
                total: leads.length + webResults.length,
                totalAvailable: (intent as any)?._totalAvailable || leads.length,
                source: leads.some(l => l.source?.includes('Lead Search'))
                    ? 'Lead Search'
                    : leads.some(l => l.source?.includes('Database'))
                        ? 'Local DB'
                        : 'Web Search'
            }
        });

    } catch (error: any) {
        console.error('Agent Error:', error);

        // Log to centralized error tracker (non-blocking)
        logApiError('/api/agent', error, {
            method: 'POST',
            status: 500,
        }).catch(() => { /* best effort */ });

        return NextResponse.json({
            error: 'Internal processing error',
            message: 'Sorry, I hit a snag. Can you rephrase that?',
            leads: [],
            toolsUsed: [],
            suggestedNextSteps: ['Try rephrasing your question']
        }, { status: 500 });
    }
}
