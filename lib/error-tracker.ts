/**
 * Centralized Error Tracking & Logging System
 *
 * Captures errors from all parts of the app, deduplicates them,
 * logs to Supabase, and auto-creates issue ledger entries for recurring bugs.
 */

import { createSupabaseAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// ─── Types ───────────────────────────────────────────
export type ErrorType = 'runtime' | 'api' | 'database' | 'auth' | 'payment' | 'scraper' | 'ai';
export type Severity = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type ErrorStatus = 'open' | 'investigating' | 'resolved' | 'ignored' | 'wont_fix';

export interface ErrorLogEntry {
    errorType: ErrorType;
    severity: Severity;
    message: string;
    stackTrace?: string;
    sourceFile?: string;
    sourceFunction?: string;
    apiRoute?: string;
    httpStatus?: number;
    requestMethod?: string;
    requestPath?: string;
    requestBody?: Record<string, unknown>;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
}

// ─── Error Hash (for dedup) ──────────────────────────
function computeErrorHash(message: string, sourceFile?: string, sourceFunction?: string): string {
    const normalized = `${message}|${sourceFile || ''}|${sourceFunction || ''}`.toLowerCase().trim();
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

// ─── Auto-detect severity from error characteristics ─
function inferSeverity(error: Error | string, errorType: ErrorType): Severity {
    const msg = typeof error === 'string' ? error : error.message;
    const lower = msg.toLowerCase();

    if (errorType === 'payment' || errorType === 'auth') return 'critical';
    if (lower.includes('timeout') || lower.includes('rate limit')) return 'warning';
    if (lower.includes('not found') || lower.includes('404')) return 'info';
    if (lower.includes('crash') || lower.includes('fatal') || lower.includes('oom')) return 'critical';
    if (errorType === 'database') return 'error';
    return 'error';
}

// ─── Threshold for auto-creating issue ledger entries ─
const AUTO_ISSUE_THRESHOLD = 3; // Create issue after 3 occurrences

// ─── Main Logging Function ───────────────────────────
export async function logError(entry: ErrorLogEntry): Promise<string | null> {
    try {
        const supabase = createSupabaseAdminClient();
        const errorHash = computeErrorHash(entry.message, entry.sourceFile, entry.sourceFunction);

        // Check if we already have this error (dedup by hash)
        const { data: existing } = await supabase
            .from('error_logs')
            .select('id, occurrence_count')
            .eq('error_hash', errorHash)
            .eq('status', 'open')
            .maybeSingle();

        if (existing) {
            // Increment occurrence count and update last_seen
            await supabase
                .from('error_logs')
                .update({
                    occurrence_count: existing.occurrence_count + 1,
                    last_seen_at: new Date().toISOString(),
                    metadata: entry.metadata || {},
                })
                .eq('id', existing.id);

            // Auto-create issue if threshold crossed
            if (existing.occurrence_count + 1 === AUTO_ISSUE_THRESHOLD) {
                await autoCreateIssue(entry, existing.occurrence_count + 1, existing.id);
            }

            return existing.id;
        }

        // Insert new error log
        const { data, error } = await supabase
            .from('error_logs')
            .insert({
                user_id: entry.userId || null,
                session_id: entry.sessionId || null,
                error_type: entry.errorType,
                severity: entry.severity,
                message: entry.message,
                stack_trace: entry.stackTrace || null,
                source_file: entry.sourceFile || null,
                source_function: entry.sourceFunction || null,
                api_route: entry.apiRoute || null,
                http_status: entry.httpStatus || null,
                request_method: entry.requestMethod || null,
                request_path: entry.requestPath || null,
                request_body: entry.requestBody || null,
                error_hash: errorHash,
                metadata: entry.metadata || {},
            })
            .select('id')
            .single();

        if (error) {
            console.error('[ErrorTracker] Failed to log error to DB:', error);
            return null;
        }

        return data?.id || null;
    } catch (e) {
        // Last resort: log to console if DB logging fails
        console.error('[ErrorTracker] Meta-error while logging:', e);
        console.error('[ErrorTracker] Original error:', entry.message);
        return null;
    }
}

// ─── Convenience wrappers ────────────────────────────

/** Log an API route error with full request context */
export async function logApiError(
    routePath: string,
    error: Error | string,
    context?: {
        userId?: string;
        sessionId?: string;
        method?: string;
        body?: Record<string, unknown>;
        status?: number;
    }
): Promise<string | null> {
    const err = typeof error === 'string' ? new Error(error) : error;
    return logError({
        errorType: 'api',
        severity: inferSeverity(err, 'api'),
        message: err.message,
        stackTrace: err.stack,
        apiRoute: routePath,
        sourceFile: routePath,
        httpStatus: context?.status,
        requestMethod: context?.method,
        requestPath: routePath,
        requestBody: context?.body,
        userId: context?.userId,
        sessionId: context?.sessionId,
    });
}

/** Log a database error */
export async function logDbError(
    operation: string,
    error: { message?: string; code?: string; details?: string },
    context?: { userId?: string; sourceFile?: string }
): Promise<string | null> {
    return logError({
        errorType: 'database',
        severity: 'error',
        message: `DB ${operation}: ${error.message || 'Unknown'} (code=${error.code || 'N/A'})`,
        sourceFile: context?.sourceFile || 'unknown',
        sourceFunction: operation,
        userId: context?.userId,
        metadata: { dbCode: error.code, dbDetails: error.details },
    });
}

/** Log an AI/Gemini error */
export async function logAiError(
    operation: string,
    error: Error | string,
    context?: { userId?: string; sessionId?: string; tier?: string }
): Promise<string | null> {
    const err = typeof error === 'string' ? new Error(error) : error;
    return logError({
        errorType: 'ai',
        severity: inferSeverity(err, 'ai'),
        message: err.message,
        stackTrace: err.stack,
        sourceFunction: operation,
        sourceFile: 'lib/gemini.ts',
        userId: context?.userId,
        sessionId: context?.sessionId,
        metadata: { tier: context?.tier },
    });
}

/** Log a payment/billing error */
export async function logPaymentError(
    operation: string,
    error: Error | string,
    context?: { userId?: string; tier?: string; amount?: number }
): Promise<string | null> {
    const err = typeof error === 'string' ? new Error(error) : error;
    return logError({
        errorType: 'payment',
        severity: 'critical',
        message: err.message,
        stackTrace: err.stack,
        sourceFunction: operation,
        sourceFile: 'lib/yoco.ts',
        userId: context?.userId,
        metadata: { tier: context?.tier, amount: context?.amount },
    });
}

/** Log a scraper error */
export async function logScraperError(
    url: string,
    error: Error | string,
    context?: { userId?: string }
): Promise<string | null> {
    const err = typeof error === 'string' ? new Error(error) : error;
    return logError({
        errorType: 'scraper',
        severity: inferSeverity(err, 'scraper'),
        message: `Scrape failed for ${url}: ${err.message}`,
        stackTrace: err.stack,
        sourceFile: 'lib/scraper.ts',
        sourceFunction: 'scrapeContactsFromUrl',
        userId: context?.userId,
        metadata: { targetUrl: url },
    });
}

// ─── Auto-create issue ledger entry ──────────────────
async function autoCreateIssue(entry: ErrorLogEntry, occurrenceCount: number, errorLogId: string): Promise<void> {
    try {
        const supabase = createSupabaseAdminClient();

        const categoryMap: Record<ErrorType, string> = {
            runtime: 'bug',
            api: 'bug',
            database: 'bug',
            auth: 'security',
            payment: 'bug',
            scraper: 'bug',
            ai: 'bug',
        };

        await supabase.from('issue_ledger').insert({
            title: `Auto-detected: ${entry.message.slice(0, 100)}`,
            description: `This error has occurred ${occurrenceCount} times.\n\nSource: ${entry.sourceFile || 'unknown'}\nFunction: ${entry.sourceFunction || 'unknown'}\nType: ${entry.errorType}\n\nFull message: ${entry.message}`,
            category: categoryMap[entry.errorType] || 'bug',
            severity: entry.severity === 'critical' ? 'critical' : entry.severity === 'warning' ? 'low' : 'medium',
            source: 'auto_detected',
            source_ref: errorLogId,
            affected_file: entry.sourceFile || null,
            error_count: occurrenceCount,
            tags: [entry.errorType, entry.severity],
        });
    } catch (e) {
        console.error('[ErrorTracker] Failed to auto-create issue:', e);
    }
}

// ─── Query functions for admin dashboard ─────────────

/** Get recent errors with pagination */
export async function getRecentErrors(options?: {
    limit?: number;
    offset?: number;
    severity?: Severity;
    status?: ErrorStatus;
    errorType?: ErrorType;
}): Promise<{ errors: any[]; total: number }> {
    const supabase = createSupabaseAdminClient();
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let query = supabase
        .from('error_logs')
        .select('*', { count: 'exact' })
        .order('last_seen_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (options?.severity) query = query.eq('severity', options.severity);
    if (options?.status) query = query.eq('status', options.status);
    if (options?.errorType) query = query.eq('error_type', options.errorType);

    const { data, error, count } = await query;

    if (error) {
        console.error('[ErrorTracker] Query failed:', error);
        return { errors: [], total: 0 };
    }

    return { errors: data || [], total: count || 0 };
}

/** Get error stats summary */
export async function getErrorStats(): Promise<{
    totalOpen: number;
    criticalCount: number;
    last24hCount: number;
    topErrors: { message: string; count: number; severity: string }[];
}> {
    const supabase = createSupabaseAdminClient();

    const [openResult, criticalResult, recentResult, topResult] = await Promise.all([
        supabase.from('error_logs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('error_logs').select('id', { count: 'exact', head: true }).eq('severity', 'critical').eq('status', 'open'),
        supabase.from('error_logs').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('error_logs').select('message, occurrence_count, severity').eq('status', 'open').order('occurrence_count', { ascending: false }).limit(10),
    ]);

    return {
        totalOpen: openResult.count || 0,
        criticalCount: criticalResult.count || 0,
        last24hCount: recentResult.count || 0,
        topErrors: (topResult.data || []).map(e => ({
            message: e.message,
            count: e.occurrence_count,
            severity: e.severity,
        })),
    };
}

// ─── Issue Ledger Queries ────────────────────────────

/** Get all issues from the ledger */
export async function getIssueLedger(options?: {
    status?: string;
    category?: string;
    severity?: string;
    limit?: number;
}): Promise<any[]> {
    const supabase = createSupabaseAdminClient();
    const limit = options?.limit || 100;

    let query = supabase
        .from('issue_ledger')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (options?.status) query = query.eq('status', options.status);
    if (options?.category) query = query.eq('category', options.category);
    if (options?.severity) query = query.eq('severity', options.severity);

    const { data, error } = await query;
    if (error) {
        console.error('[IssueLedger] Query failed:', error);
        return [];
    }
    return data || [];
}

/** Create a manual issue ledger entry */
export async function createIssue(params: {
    title: string;
    description?: string;
    category?: string;
    severity?: string;
    affectedFile?: string;
    affectedComponent?: string;
    tags?: string[];
    reportedBy?: string;
}): Promise<string | null> {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
        .from('issue_ledger')
        .insert({
            title: params.title,
            description: params.description || '',
            category: params.category || 'bug',
            severity: params.severity || 'medium',
            source: 'manual',
            affected_file: params.affectedFile || null,
            affected_component: params.affectedComponent || null,
            tags: params.tags || [],
            reported_by: params.reportedBy || null,
        })
        .select('id')
        .single();

    if (error) {
        console.error('[IssueLedger] Create failed:', error);
        return null;
    }
    return data?.id || null;
}

/** Update issue status */
export async function updateIssueStatus(
    issueId: string,
    status: string,
    notes?: string
): Promise<boolean> {
    const supabase = createSupabaseAdminClient();

    const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
    };

    if (status === 'resolved' || status === 'closed') {
        updates.resolved_at = new Date().toISOString();
    }
    if (notes) {
        updates.resolution_notes = notes;
    }

    const { error } = await supabase
        .from('issue_ledger')
        .update(updates)
        .eq('id', issueId);

    return !error;
}
