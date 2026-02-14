import { NextRequest, NextResponse } from 'next/server';
import { requireUser, isAdminUser } from '@/lib/api-auth';
import { getUserCredits, deductCredits } from '@/lib/credits';
import { getContextPack } from '@/lib/god-mode';
import { searchKnowledgeBase } from '@/lib/rag';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const DEEP_THINKING_BUDGET = 10000; // tokens for reasoning
const DEEP_THINKING_COST = 5;
const MAX_TOKENS = 8192;

function getClient(): Anthropic {
    if (process.env.AI_GATEWAY_API_KEY) {
        return new Anthropic({
            apiKey: process.env.AI_GATEWAY_API_KEY,
            baseURL: 'https://ai-gateway.vercel.sh/v1',
        });
    }
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

function getModelId(): string {
    const base = 'claude-opus-4-6';
    return process.env.AI_GATEWAY_API_KEY ? `anthropic/${base}` : base;
}

function buildDeepThinkingPrompt(artistContext: string, knowledgeContext: string): string {
    return `# V-PRAI DEEP THINKING MODE

You are **V-Prai** operating in **Deep Thinking Mode** — advanced, extended reasoning for complex strategy on the Visio Lead Gen platform.

## YOUR APPROACH
1. **THINK DEEPLY** — break down the problem systematically, consider multiple approaches and trade-offs
2. **SHOW YOUR WORK** — your reasoning process is visible to the user. Be thorough, structured (numbered steps), and call out assumptions
3. **DELIVER STRATEGIC VALUE** — go beyond surface-level advice. Provide actionable, prioritized recommendations with success metrics and KPIs
4. **EXPLAIN THE WHY** — for every recommendation, explain the strategic reasoning

## USE CASES FOR DEEP THINKING
- Complex multi-phase campaign planning
- Budget allocation with ROI analysis
- Market entry strategies for new regions
- High-stakes pitch strategy and positioning
- Competitive analysis and positioning
- Release rollout planning (singles, albums, EPs)
- Brand deal negotiation strategy
- Crisis PR planning

## INDUSTRY KNOWLEDGE
- **Release Timeline**: Submit to DSPs 4+ weeks early. Pitch editorial playlists 3-4 weeks before. PR outreach 3 weeks before.
- **Pitch Timing**: Tuesday-Thursday, 9-11 AM recipient timezone. Never Fridays or Mondays.
- **Follow-up Cadence**: First follow-up 5-7 days later. Max 2 follow-ups. Add new value each time.
- **Platform Priority**: Amapiano -> Spotify + Apple Music + TikTok. Hip-Hop -> Spotify + YouTube + Instagram.

${artistContext}
${knowledgeContext}

Think step-by-step with depth, then deliver your strategic recommendation. Use markdown formatting for clarity.`;
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireUser(request);
        if (!auth.ok) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Tier gate: Enterprise/Agency only
        if (!isAdminUser(auth.user)) {
            const supabase = await createSupabaseServerClient();
            const { data: profile } = await supabase
                .from('profiles')
                .select('subscription_tier')
                .eq('id', auth.user.id)
                .single();

            if (!profile || !['enterprise', 'agency'].includes(profile.subscription_tier)) {
                return NextResponse.json({
                    error: 'tier_locked',
                    message: 'Deep Thinking is exclusive to Enterprise and Agency tiers. Upgrade to unlock extended reasoning.',
                    upgradeUrl: '/billing?tier=enterprise'
                }, { status: 403 });
            }
        }

        // Credit check
        const credits = await getUserCredits(auth.user.id);
        if (credits < DEEP_THINKING_COST) {
            return NextResponse.json({
                error: 'insufficient_credits',
                message: `Deep Thinking requires ${DEEP_THINKING_COST} credits. You have ${credits}.`,
                required: DEEP_THINKING_COST,
                available: credits
            }, { status: 402 });
        }

        // Deduct credits
        const deducted = await deductCredits(auth.user.id, DEEP_THINKING_COST, 'deep_thinking');
        if (!deducted) {
            return NextResponse.json({ error: 'Credit deduction failed' }, { status: 500 });
        }

        const body = await request.json();
        const { message, conversationHistory = [] } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        // Fetch artist context
        const context = await getContextPack({ userId: auth.user.id, accessToken: auth.accessToken });
        let artistBlock = '';
        if (context) {
            artistBlock = `## ARTIST CONTEXT\n- **Name**: ${context.identity.name}\n- **Genre**: ${context.identity.genre}\n- **Location**: ${context.location.country}\n- **Brand Voice**: ${context.identity.brandVoice}\n- **Story**: ${context.story.summary}`;
        }

        // Fetch knowledge
        let knowledgeBlock = '';
        try {
            const chunks = await searchKnowledgeBase(message, 3);
            if (chunks?.length) {
                knowledgeBlock = `## KNOWLEDGE BASE\n${chunks.map(c => `[${c.category}]: ${c.content}`).join('\n\n')}`;
            }
        } catch { /* knowledge unavailable */ }

        // Build messages array
        const messages: Anthropic.MessageParam[] = [];
        const recentHistory = conversationHistory.slice(-10);
        for (const m of recentHistory) {
            messages.push({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            });
        }
        // Ensure alternating and starts with user
        if (messages.length === 0 || messages[0].role !== 'user') {
            messages.unshift({ role: 'user', content: '(conversation start)' });
        }
        messages.push({ role: 'user', content: message });
        // Ensure no consecutive same-role
        const cleaned: Anthropic.MessageParam[] = [];
        for (const m of messages) {
            if (cleaned.length > 0 && cleaned[cleaned.length - 1].role === m.role) {
                cleaned[cleaned.length - 1] = { role: m.role, content: cleaned[cleaned.length - 1].content + '\n\n' + m.content };
            } else {
                cleaned.push(m);
            }
        }

        // Claude with extended thinking
        const client = getClient();
        const stream = client.messages.stream({
            model: getModelId(),
            max_tokens: MAX_TOKENS,
            thinking: {
                type: 'enabled',
                budget_tokens: DEEP_THINKING_BUDGET
            },
            system: buildDeepThinkingPrompt(artistBlock, knowledgeBlock),
            messages: cleaned
        });

        // Stream SSE response
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const event of stream) {
                        if (event.type === 'content_block_delta') {
                            const delta = event.delta as any;
                            if (delta.type === 'thinking_delta') {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                    type: 'thinking',
                                    content: delta.thinking
                                })}\n\n`));
                            } else if (delta.type === 'text_delta') {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                    type: 'text',
                                    content: delta.text
                                })}\n\n`));
                            }
                        }
                    }
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                } catch (err: any) {
                    console.error('[Deep Thinking] Stream error:', err?.message);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'error',
                        content: 'Deep Thinking encountered an error. Your credits have been used.'
                    })}\n\n`));
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        });

    } catch (error: any) {
        console.error('[Deep Thinking] Error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            message: 'Deep Thinking failed. Please try again.'
        }, { status: 500 });
    }
}
