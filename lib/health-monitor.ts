/**
 * Health Monitor & Auto Issue Detection System
 *
 * Runs health checks on critical system components,
 * auto-detects issues, and creates issue ledger entries.
 * Designed to be called by a cron job or on-demand.
 */

import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { logError } from '@/lib/error-tracker';
import { createIssue, getIssueLedger } from '@/lib/error-tracker';

// ─── Types ───────────────────────────────────────────
export interface HealthCheckResult {
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    message: string;
    latencyMs?: number;
    metadata?: Record<string, unknown>;
}

export interface SystemHealth {
    overall: 'healthy' | 'degraded' | 'down';
    checks: HealthCheckResult[];
    timestamp: string;
    issues: string[];
}

// ─── Individual Health Checks ────────────────────────

/** Check Supabase database connectivity */
async function checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
        const supabase = createSupabaseAdminClient();
        const { error } = await supabase.from('profiles').select('id').limit(1);
        const latency = Date.now() - start;

        if (error) {
            return { name: 'database', status: 'down', message: `DB error: ${error.message}`, latencyMs: latency };
        }
        if (latency > 5000) {
            return { name: 'database', status: 'degraded', message: `Slow response: ${latency}ms`, latencyMs: latency };
        }
        return { name: 'database', status: 'healthy', message: `OK (${latency}ms)`, latencyMs: latency };
    } catch (e: any) {
        return { name: 'database', status: 'down', message: e.message, latencyMs: Date.now() - start };
    }
}

/** Check Gemini AI API connectivity */
async function checkAiService(): Promise<HealthCheckResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { name: 'ai_service', status: 'down', message: 'GEMINI_API_KEY not configured' };
    }

    // Just verify the key format is present — don't make an actual API call in health checks
    return { name: 'ai_service', status: 'healthy', message: 'API key configured' };
}

/** Check Serper (Google Search) API */
async function checkSearchApi(): Promise<HealthCheckResult> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
        return { name: 'search_api', status: 'degraded', message: 'SERPER_API_KEY not configured — search will fail' };
    }
    return { name: 'search_api', status: 'healthy', message: 'API key configured' };
}

/** Check Yoco payment gateway */
async function checkPayments(): Promise<HealthCheckResult> {
    const testKey = process.env.YOCO_TEST_SECRET_KEY;
    const liveKey = process.env.YOCO_LIVE_SECRET_KEY;
    const mode = process.env.YOCO_MODE || 'test';

    if (mode === 'live' && !liveKey) {
        return { name: 'payments', status: 'down', message: 'YOCO_LIVE_SECRET_KEY missing in live mode' };
    }
    if (mode === 'test' && !testKey) {
        return { name: 'payments', status: 'degraded', message: 'YOCO_TEST_SECRET_KEY missing' };
    }
    return { name: 'payments', status: 'healthy', message: `${mode} mode configured` };
}

/** Check for error rate spikes */
async function checkErrorRate(): Promise<HealthCheckResult> {
    try {
        const supabase = createSupabaseAdminClient();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const { count } = await supabase
            .from('error_logs')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', oneHourAgo);

        const errorCount = count || 0;
        if (errorCount > 100) {
            return { name: 'error_rate', status: 'down', message: `${errorCount} errors in last hour — possible incident`, metadata: { errorCount } };
        }
        if (errorCount > 20) {
            return { name: 'error_rate', status: 'degraded', message: `${errorCount} errors in last hour — elevated`, metadata: { errorCount } };
        }
        return { name: 'error_rate', status: 'healthy', message: `${errorCount} errors in last hour`, metadata: { errorCount } };
    } catch {
        return { name: 'error_rate', status: 'healthy', message: 'Unable to check (table may not exist yet)' };
    }
}

/** Check for stale support tickets */
async function checkSupportQueue(): Promise<HealthCheckResult> {
    try {
        const supabase = createSupabaseAdminClient();
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

        const { count } = await supabase
            .from('support_tickets')
            .select('id', { count: 'exact', head: true })
            .in('status', ['open', 'in_progress'])
            .lte('created_at', threeDaysAgo);

        const staleCount = count || 0;
        if (staleCount > 10) {
            return { name: 'support_queue', status: 'degraded', message: `${staleCount} tickets older than 3 days`, metadata: { staleCount } };
        }
        return { name: 'support_queue', status: 'healthy', message: `${staleCount} stale tickets`, metadata: { staleCount } };
    } catch {
        return { name: 'support_queue', status: 'healthy', message: 'Unable to check (table may not exist yet)' };
    }
}

/** Check credit system integrity */
async function checkCreditSystem(): Promise<HealthCheckResult> {
    try {
        const supabase = createSupabaseAdminClient();

        // Check for users with negative credits (should never happen)
        const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .lt('credits_balance', 0);

        const negativeCount = count || 0;
        if (negativeCount > 0) {
            return { name: 'credit_system', status: 'degraded', message: `${negativeCount} users with negative credits`, metadata: { negativeCount } };
        }
        return { name: 'credit_system', status: 'healthy', message: 'All credit balances valid' };
    } catch {
        return { name: 'credit_system', status: 'healthy', message: 'Unable to check' };
    }
}

// ─── Main Health Check ───────────────────────────────

/** Run all health checks and return system status */
export async function runHealthCheck(): Promise<SystemHealth> {
    const checks = await Promise.all([
        checkDatabase(),
        checkAiService(),
        checkSearchApi(),
        checkPayments(),
        checkErrorRate(),
        checkSupportQueue(),
        checkCreditSystem(),
    ]);

    const issues: string[] = [];

    // Determine overall status
    let overall: 'healthy' | 'degraded' | 'down' = 'healthy';
    for (const check of checks) {
        if (check.status === 'down') {
            overall = 'down';
            issues.push(`${check.name}: ${check.message}`);
        } else if (check.status === 'degraded' && overall !== 'down') {
            overall = 'degraded';
            issues.push(`${check.name}: ${check.message}`);
        }
    }

    // Auto-create issues for down/degraded services
    if (issues.length > 0) {
        await autoReportHealthIssues(checks.filter(c => c.status !== 'healthy'));
    }

    return {
        overall,
        checks,
        timestamp: new Date().toISOString(),
        issues,
    };
}

/** Auto-report health issues to the issue ledger */
async function autoReportHealthIssues(failedChecks: HealthCheckResult[]): Promise<void> {
    for (const check of failedChecks) {
        // Check if there's already an open issue for this check
        const existing = await getIssueLedger({
            status: 'open',
            category: check.name === 'payments' ? 'bug' : 'performance',
        });

        const alreadyReported = existing.some((issue: any) =>
            issue.title.includes(check.name) && issue.source === 'auto_detected'
        );

        if (!alreadyReported) {
            await createIssue({
                title: `Health check: ${check.name} is ${check.status}`,
                description: check.message,
                category: check.status === 'down' ? 'bug' : 'performance',
                severity: check.status === 'down' ? 'critical' : 'medium',
                tags: ['health_check', check.name],
            });
        }

        // Also log as error
        await logError({
            errorType: 'runtime',
            severity: check.status === 'down' ? 'critical' : 'warning',
            message: `Health check failed: ${check.name} — ${check.message}`,
            sourceFile: 'lib/health-monitor.ts',
            sourceFunction: `check${check.name.charAt(0).toUpperCase() + check.name.slice(1)}`,
        });
    }
}
