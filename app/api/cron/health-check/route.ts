import { NextRequest, NextResponse } from 'next/server';
import { runHealthCheck } from '@/lib/health-monitor';

export const dynamic = 'force-dynamic';

/**
 * Cron Health Check Endpoint
 *
 * Call this via Vercel Cron or external cron service every 5-15 minutes.
 * It runs all health checks and auto-creates issues for failures.
 *
 * Protected by CRON_SECRET to prevent unauthorized access.
 * Set CRON_SECRET in your environment variables.
 *
 * Configured in vercel.json crons array (runs every 15 minutes).
 */
export async function GET(request: NextRequest) {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const health = await runHealthCheck();
    return NextResponse.json(health, {
        status: health.overall === 'healthy' ? 200 : 503,
    });
}
