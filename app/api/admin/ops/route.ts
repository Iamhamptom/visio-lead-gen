import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getRecentErrors, getErrorStats, getIssueLedger, updateIssueStatus, createIssue } from '@/lib/error-tracker';
import { getAllOpenTickets, getFeedbackStats } from '@/lib/support';
import { getTopPatterns } from '@/lib/learning-engine';
import { getActiveSkills } from '@/lib/knowledge-base';
import { runHealthCheck } from '@/lib/health-monitor';

export const dynamic = 'force-dynamic';

/**
 * Admin Ops Dashboard API
 * GET  — Full ops overview (errors, issues, tickets, feedback, health, learning)
 * POST — Actions: create_issue, update_issue, resolve_error
 */

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const section = request.nextUrl.searchParams.get('section') || 'overview';

    try {
        switch (section) {
            case 'overview': {
                const [errorStats, issues, tickets, feedbackStats, health] = await Promise.all([
                    getErrorStats(),
                    getIssueLedger({ limit: 20 }),
                    getAllOpenTickets(10),
                    getFeedbackStats(),
                    runHealthCheck(),
                ]);

                return NextResponse.json({
                    errorStats,
                    issues,
                    openTickets: tickets,
                    feedbackStats,
                    health,
                });
            }

            case 'errors': {
                const severity = request.nextUrl.searchParams.get('severity') || undefined;
                const status = request.nextUrl.searchParams.get('status') || undefined;
                const errorType = request.nextUrl.searchParams.get('error_type') || undefined;
                const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
                const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

                const result = await getRecentErrors({
                    limit,
                    offset,
                    severity: severity as any,
                    status: status as any,
                    errorType: errorType as any,
                });

                return NextResponse.json(result);
            }

            case 'issues': {
                const status = request.nextUrl.searchParams.get('status') || undefined;
                const category = request.nextUrl.searchParams.get('category') || undefined;
                const severity = request.nextUrl.searchParams.get('severity') || undefined;

                const issues = await getIssueLedger({ status, category, severity });
                return NextResponse.json({ issues });
            }

            case 'tickets': {
                const tickets = await getAllOpenTickets(100);
                return NextResponse.json({ tickets });
            }

            case 'feedback': {
                const stats = await getFeedbackStats();
                return NextResponse.json(stats);
            }

            case 'learning': {
                const [patterns, skills] = await Promise.all([
                    getTopPatterns(20),
                    getActiveSkills(),
                ]);

                return NextResponse.json({ patterns, skills });
            }

            case 'health': {
                const health = await runHealthCheck();
                return NextResponse.json(health);
            }

            default:
                return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
        }
    } catch (error: any) {
        console.error('[Admin Ops] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'create_issue': {
                const id = await createIssue({
                    title: body.title,
                    description: body.description,
                    category: body.category,
                    severity: body.severity,
                    affectedFile: body.affectedFile,
                    affectedComponent: body.affectedComponent,
                    tags: body.tags,
                    reportedBy: auth.user.id,
                });
                return NextResponse.json({ id });
            }

            case 'update_issue': {
                const success = await updateIssueStatus(body.issueId, body.status, body.notes);
                return NextResponse.json({ success });
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
