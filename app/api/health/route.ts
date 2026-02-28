import { NextResponse } from 'next/server';
import { runHealthCheck } from '@/lib/health-monitor';

export const dynamic = 'force-dynamic';

/**
 * System Health Check Endpoint
 * GET — Returns overall system health status
 *
 * Checks: database, AI service, search API, payments, error rate,
 * support queue, credit system integrity.
 *
 * Returns 200 if healthy, 503 if degraded/down.
 */
export async function GET() {
    try {
        const health = await runHealthCheck();

        const statusCode = health.overall === 'healthy' ? 200 : 503;
        return NextResponse.json(health, { status: statusCode });
    } catch (error: any) {
        return NextResponse.json({
            overall: 'down',
            checks: [],
            timestamp: new Date().toISOString(),
            issues: [`Health check itself failed: ${error.message}`],
        }, { status: 503 });
    }
}
