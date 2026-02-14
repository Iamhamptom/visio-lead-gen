// ============================================================================
// AUTOMATION BANK — Pre-built Skills & Workflows for V-Prai
// ============================================================================
// This is V-Prai's skill orchestration layer. When qualified requests come in,
// V-Prai can trigger pre-built automations that execute complex workflows
// seamlessly in the background while appearing super intelligent to the user.
// ============================================================================

import { performSmartScrape, formatScrapeForContext } from './smart-scrape';
import { performLeadSearch, performSmartSearch } from './search';
import { performDeepSearch } from './pipelines';

export interface AutomationSkill {
    id: string;
    name: string;
    description: string;
    triggerPatterns: string[]; // Keywords/phrases that trigger this automation
    creditCost: number;
    requiredTier?: string[]; // undefined = all tiers
    execute: (params: AutomationParams) => Promise<AutomationResult>;
}

export interface AutomationParams {
    userMessage: string;
    query?: string;
    country?: string;
    genre?: string;
    artistContext?: any;
    conversationHistory?: any[];
}

export interface AutomationResult {
    success: boolean;
    data: any;
    summary: string;
    logs: string[];
    suggestedNextSteps?: string[];
}

// ─── AUTOMATION REGISTRY ────────────────────────────────────
export const AUTOMATION_REGISTRY: Record<string, AutomationSkill> = {

    // Skill 1: Viral Content Research
    viral_content_research: {
        id: 'viral_content_research',
        name: 'Viral Content Research',
        description: 'Scrapes YouTube, TikTok, Twitter for top-performing content on a topic. Pulls transcripts, comments, and engagement metrics.',
        triggerPatterns: [
            'what\'s working on',
            'viral content about',
            'trending',
            'best performing',
            'research social media',
            'what people are saying about',
            'find viral videos',
        ],
        creditCost: 3,
        execute: async (params) => {
            const query = params.query || params.userMessage;
            const logs: string[] = [`🔬 Executing: Viral Content Research for "${query}"`];

            const scrapeResults = await performSmartScrape({
                query,
                platforms: ['youtube', 'tiktok', 'twitter'],
                maxResults: 10,
                sortBy: 'engagement',
            });

            const totalScraped = scrapeResults.reduce((s, r) => s + r.totalFound, 0);
            logs.push(`✅ Scraped ${totalScraped} viral posts across ${scrapeResults.length} platforms`);

            const formattedContext = formatScrapeForContext(scrapeResults);

            return {
                success: true,
                data: { scrapeResults, context: formattedContext },
                summary: `Found ${totalScraped} viral pieces of content. Top performing: ${scrapeResults[0]?.results[0]?.title || 'N/A'}`,
                logs,
                suggestedNextSteps: [
                    'Draft content inspired by these insights',
                    'Research another trending topic',
                    'Find contacts mentioned in viral posts'
                ],
            };
        },
    },

    // Skill 2: Curator Discovery Pipeline
    curator_discovery: {
        id: 'curator_discovery',
        name: 'Curator Discovery Pipeline',
        description: 'Multi-source search for playlist curators, journalists, and influencers in a specific market.',
        triggerPatterns: [
            'find curators',
            'find playlist curators',
            'get me journalists',
            'discover influencers',
            'find bloggers',
            'get contacts for',
        ],
        creditCost: 2,
        execute: async (params) => {
            const query = params.query || params.userMessage;
            const country = params.country || 'ZA';
            const logs: string[] = [`🎯 Executing: Curator Discovery for "${query}" in ${country}`];

            const results = await performLeadSearch(query, country);
            logs.push(`✅ Found ${results.length} potential curators/journalists`);

            return {
                success: true,
                data: results,
                summary: `Discovered ${results.length} curators and media contacts in ${country}`,
                logs,
                suggestedNextSteps: [
                    'Draft personalized pitches',
                    'Search for more in a different market',
                    'Export contacts and create outreach list',
                ],
            };
        },
    },

    // Skill 3: Deep Contact Enrichment
    deep_contact_enrichment: {
        id: 'deep_contact_enrichment',
        name: 'Deep Contact Enrichment',
        description: 'Multi-pipeline deep search across Apollo, LinkedIn, PhantomBuster, and web scraping to find verified contacts.',
        triggerPatterns: [
            'deep search',
            'comprehensive search',
            'find verified contacts',
            'enrich contacts',
            'get me 50+',
            'thorough search',
        ],
        creditCost: 5,
        execute: async (params) => {
            const query = params.query || params.userMessage;
            const country = params.country || 'ZA';
            const logs: string[] = [`🚀 Executing: Deep Contact Enrichment for "${query}"`];

            const deepResult = await performDeepSearch(query, country);
            logs.push(...deepResult.logs);

            const sourcesUsed = Object.keys(deepResult.pipelineResults).length;
            const totalContacts = deepResult.contacts.length;

            return {
                success: true,
                data: deepResult.contacts,
                summary: `Deep search found ${totalContacts} verified contacts across ${sourcesUsed} sources`,
                logs,
                suggestedNextSteps: [
                    'Filter by confidence score',
                    'Export to CRM',
                    'Draft outreach sequence',
                ],
            };
        },
    },

    // Skill 4: PR Trend Monitor
    pr_trend_monitor: {
        id: 'pr_trend_monitor',
        name: 'PR Trend Monitor',
        description: 'Monitors what\'s trending in music PR by scraping thought leaders, PR agencies, and industry educators.',
        triggerPatterns: [
            'what\'s trending in PR',
            'latest PR strategies',
            'what are PR pros saying',
            'current PR trends',
            'music PR best practices',
        ],
        creditCost: 3,
        execute: async (params) => {
            const logs: string[] = [`📊 Executing: PR Trend Monitor`];

            // Scrape for PR strategy content
            const scrapeResults = await performSmartScrape({
                query: 'music PR strategy tips 2026',
                platforms: ['youtube', 'twitter'],
                maxResults: 15,
                sortBy: 'engagement',
            });

            const totalScraped = scrapeResults.reduce((s, r) => s + r.totalFound, 0);
            logs.push(`✅ Analyzed ${totalScraped} trending PR posts`);

            const formattedContext = formatScrapeForContext(scrapeResults);

            return {
                success: true,
                data: { scrapeResults, context: formattedContext },
                summary: `Monitored ${totalScraped} trending PR posts. Detected patterns in pitch strategies and campaign timing.`,
                logs,
                suggestedNextSteps: [
                    'Apply these insights to your campaign',
                    'Save trending tactics for later',
                    'Research a specific PR tactic in depth',
                ],
            };
        },
    },

    // Skill 5: Campaign Rollout Research
    campaign_rollout_research: {
        id: 'campaign_rollout_research',
        name: 'Campaign Rollout Research',
        description: 'Researches successful album/single rollout strategies from similar artists by scraping case studies and breakdowns.',
        triggerPatterns: [
            'successful rollouts',
            'album rollout examples',
            'how did [artist] launch',
            'case studies',
            'rollout strategy for',
            'campaign examples',
        ],
        creditCost: 3,
        execute: async (params) => {
            const query = params.query || `successful ${params.genre || 'music'} album rollouts case studies`;
            const logs: string[] = [`📚 Executing: Campaign Rollout Research for "${query}"`];

            const scrapeResults = await performSmartScrape({
                query,
                platforms: ['youtube', 'twitter'],
                maxResults: 10,
                sortBy: 'engagement',
            });

            const totalScraped = scrapeResults.reduce((s, r) => s + r.totalFound, 0);
            logs.push(`✅ Researched ${totalScraped} rollout case studies`);

            const formattedContext = formatScrapeForContext(scrapeResults);

            return {
                success: true,
                data: { scrapeResults, context: formattedContext },
                summary: `Analyzed ${totalScraped} successful rollout campaigns. Identified common patterns and winning tactics.`,
                logs,
                suggestedNextSteps: [
                    'Build your rollout timeline based on these insights',
                    'Research a specific artist\'s strategy',
                    'Draft your campaign plan',
                ],
            };
        },
    },

    // Skill 6: Competitor Intelligence
    competitor_intelligence: {
        id: 'competitor_intelligence',
        name: 'Competitor Intelligence',
        description: 'Analyzes competitor PR strategies by finding their press coverage, playlist placements, and social campaigns.',
        triggerPatterns: [
            'competitor analysis',
            'how is [artist] getting coverage',
            'analyze competitor',
            'spy on',
            'what is [artist] doing',
        ],
        creditCost: 3,
        execute: async (params) => {
            const competitor = params.query || params.userMessage;
            const logs: string[] = [`🔍 Executing: Competitor Intelligence for "${competitor}"`];

            // Search for competitor mentions and coverage
            const searchResults = await performSmartSearch(`${competitor} music PR press coverage`, params.country || 'ZA');
            logs.push(`✅ Found ${searchResults.length} press mentions`);

            // Also scrape social mentions
            const scrapeResults = await performSmartScrape({
                query: `${competitor} music campaign`,
                platforms: ['twitter', 'youtube'],
                maxResults: 8,
                sortBy: 'recent',
            });

            const totalScraped = scrapeResults.reduce((s, r) => s + r.totalFound, 0);
            logs.push(`✅ Scraped ${totalScraped} social mentions`);

            return {
                success: true,
                data: { searchResults, scrapeResults },
                summary: `Analyzed ${competitor}'s PR strategy: ${searchResults.length} press mentions, ${totalScraped} social posts.`,
                logs,
                suggestedNextSteps: [
                    'Identify outlets they\'re getting coverage in',
                    'Find curators who featured them',
                    'Reverse-engineer their pitch strategy',
                ],
            };
        },
    },
};

// ─── AUTOMATION ORCHESTRATOR ────────────────────────────────
export async function detectAndExecuteAutomation(
    userMessage: string,
    params: Partial<AutomationParams>
): Promise<AutomationResult | null> {
    const lower = userMessage.toLowerCase();

    // Check each skill for trigger match
    for (const skill of Object.values(AUTOMATION_REGISTRY)) {
        const matched = skill.triggerPatterns.some(pattern =>
            lower.includes(pattern.toLowerCase())
        );

        if (matched) {
            console.log(`[Automation Bank] Triggered: ${skill.name}`);

            try {
                const result = await skill.execute({
                    userMessage,
                    ...params,
                } as AutomationParams);

                return {
                    ...result,
                    // Add metadata
                    data: {
                        ...result.data,
                        automationUsed: skill.id,
                        automationName: skill.name,
                    },
                };
            } catch (error: any) {
                console.error(`[Automation Bank] ${skill.name} failed:`, error?.message);
                return {
                    success: false,
                    data: null,
                    summary: `Automation "${skill.name}" encountered an error.`,
                    logs: [`❌ ${skill.name} failed: ${error?.message}`],
                };
            }
        }
    }

    return null; // No automation triggered
}

// ─── HELPERS ────────────────────────────────────────────────
export function listAvailableAutomations(tier?: string): AutomationSkill[] {
    return Object.values(AUTOMATION_REGISTRY).filter(skill => {
        if (!skill.requiredTier) return true;
        if (!tier) return false;
        return skill.requiredTier.includes(tier);
    });
}

export function getAutomationById(id: string): AutomationSkill | null {
    return AUTOMATION_REGISTRY[id] || null;
}
