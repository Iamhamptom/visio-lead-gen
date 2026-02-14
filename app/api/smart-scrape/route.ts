import { NextRequest, NextResponse } from 'next/server';
import { requireUser, isAdminUser } from '@/lib/api-auth';
import { getUserCredits, deductCredits } from '@/lib/credits';
import { performSmartScrape, formatScrapeForContext, SmartScrapeRequest } from '@/lib/smart-scrape';
import { generateChatResponse, hasClaudeKey } from '@/lib/claude';
import { getContextPack } from '@/lib/god-mode';

const SMART_SCRAPE_COST = 3;

export async function POST(request: NextRequest) {
    try {
        const auth = await requireUser(request);
        if (!auth.ok) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Credit check
        if (!isAdminUser(auth.user)) {
            const credits = await getUserCredits(auth.user.id);
            if (credits < SMART_SCRAPE_COST) {
                return NextResponse.json({
                    error: 'insufficient_credits',
                    message: `Smart Scrape requires ${SMART_SCRAPE_COST} credits. You have ${credits}.`,
                    required: SMART_SCRAPE_COST,
                    available: credits,
                }, { status: 402 });
            }

            const deducted = await deductCredits(auth.user.id, SMART_SCRAPE_COST, 'smart_scrape');
            if (!deducted) {
                return NextResponse.json({ error: 'Credit deduction failed' }, { status: 500 });
            }
        }

        const body = await request.json();
        const {
            query,
            platforms = ['youtube', 'tiktok', 'twitter'],
            maxResults = 10,
            sortBy = 'engagement',
            userMessage = '',
            conversationHistory = [],
        } = body;

        if (!query) {
            return NextResponse.json({ error: 'Query required' }, { status: 400 });
        }

        // Perform the scrape
        const scrapeResults = await performSmartScrape({
            query,
            platforms,
            maxResults,
            sortBy,
        } as SmartScrapeRequest);

        const totalResults = scrapeResults.reduce((sum, r) => sum + r.totalFound, 0);

        // If Claude is available, generate a synthesis
        let synthesis = '';
        if (hasClaudeKey() && totalResults > 0) {
            const scrapeContext = formatScrapeForContext(scrapeResults);
            const artistContext = await getContextPack({ userId: auth.user.id, accessToken: auth.accessToken });

            synthesis = await generateChatResponse(
                userMessage || `Analyze these social media research results about "${query}" and give me actionable insights.`,
                conversationHistory,
                artistContext,
                'business',
                scrapeContext,
                `You are V-Prai performing a Smart Scrape research analysis. You just scraped ${totalResults} pieces of content from ${platforms.join(', ')} about "${query}".

Your job:
1. Summarize the key insights from the top-performing content
2. Identify patterns in what works (hooks, formats, topics, hashtags)
3. Extract actionable advice for the user
4. Note any interesting comments or audience sentiment
5. Recommend how the user can apply these insights

Format with markdown. Be strategic and specific. Offer yes/no follow-up actions.`
            );
        }

        return NextResponse.json({
            success: true,
            message: synthesis || `Found ${totalResults} results across ${scrapeResults.length} platform(s). Apify token may be needed for full scraping.`,
            scrapeResults,
            totalResults,
            creditsCost: SMART_SCRAPE_COST,
            logs: [
                `🔬 Smart Scrape: "${query}"`,
                ...scrapeResults.map(r => `${r.platform}: ${r.totalFound} results`),
                `💳 ${SMART_SCRAPE_COST} credits used`,
            ],
        });

    } catch (error: any) {
        console.error('[Smart Scrape] Error:', error);
        return NextResponse.json({
            error: 'Smart Scrape failed',
            message: 'Research scraping encountered an error. Please try again.',
        }, { status: 500 });
    }
}
