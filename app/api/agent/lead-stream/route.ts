import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { performCascadingSearch } from '@/lib/lead-pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // ── Auth ─────────────────────────────────────────────────────────────
    const auth = await requireUser(request);
    if (!auth.ok) {
        return new Response(
            JSON.stringify({ message: 'Unauthorized' }),
            { status: auth.status, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // ── Parse search params ──────────────────────────────────────────────
    const { searchParams } = new URL(request.url);

    const contactTypes = searchParams.get('contactTypes')?.split(',').filter(Boolean) ?? [];
    const markets = searchParams.get('markets')?.split(',').filter(Boolean) ?? [];
    const genre = searchParams.get('genre') ?? '';
    const searchDepth = (searchParams.get('searchDepth') ?? 'deep') as 'quick' | 'deep' | 'full';
    const targetCount = parseInt(searchParams.get('targetCount') ?? '50', 10);

    if (contactTypes.length === 0 || markets.length === 0) {
        return new Response(
            JSON.stringify({ message: 'Missing required parameters: contactTypes, markets' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const brief = { contactTypes, markets, genre, searchDepth, targetCount, query: '' };

    // ── SSE stream ───────────────────────────────────────────────────────
    const encoder = new TextEncoder();
    const allLogs: string[] = [];

    const stream = new ReadableStream({
        async start(controller) {
            function sendEvent(data: Record<string, unknown>) {
                const payload = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(payload));
            }

            try {
                const result = await performCascadingSearch(brief, (progress) => {
                    // Accumulate logs for the final event
                    if (progress.logs) {
                        for (const log of progress.logs) {
                            if (!allLogs.includes(log)) allLogs.push(log);
                        }
                    }

                    sendEvent({
                        type: 'progress',
                        tier: progress.tier,
                        status: progress.status,
                        found: progress.found,
                        target: progress.target,
                        currentSource: progress.currentSource,
                        logs: progress.logs ?? [],
                    });
                });

                // ── Final complete event ─────────────────────────────────
                sendEvent({
                    type: 'complete',
                    contacts: result.contacts,
                    total: result.total,
                    logs: [...allLogs, ...result.logs],
                });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                sendEvent({
                    type: 'error',
                    message,
                    logs: [...allLogs, `Error: ${message}`],
                });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
