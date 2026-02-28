import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { seedInitialSkills } from '@/lib/knowledge-base';
import { createIssue } from '@/lib/error-tracker';

export const dynamic = 'force-dynamic';

/**
 * Seed the knowledge base with initial skills and
 * populate the issue ledger with known issues from the code review.
 *
 * POST /api/admin/ops/seed
 * Admin only. Idempotent (skills use upsert by slug).
 */
export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const results: { skills: number; issues: number } = { skills: 0, issues: 0 };

    // 1. Seed knowledge skills
    results.skills = await seedInitialSkills();

    // 2. Seed known issues from CODE_REVIEW.md
    const knownIssues = [
        {
            title: 'File-system JSON database used in serverless (lib/db.ts)',
            description: 'getLeadsByCountry reads JSON files via fs.readFileSync on every call. On Vercel serverless, the filesystem is read-only and ephemeral — saveLead() writes to disk but those writes are lost. Should be migrated to Supabase.',
            category: 'debt' as const,
            severity: 'medium' as const,
            affectedFile: 'lib/db.ts',
            tags: ['architecture', 'serverless', 'data-persistence'],
        },
        {
            title: 'Client-side SPA routing with rewrites pattern',
            description: 'All routes rewrite to / and the client page.tsx reads window.location.pathname. This means: no SSR, no per-page code splitting, SEO impossible for public pages, entire app JS bundle loads for every visitor.',
            category: 'improvement' as const,
            severity: 'medium' as const,
            affectedFile: 'next.config.ts',
            tags: ['architecture', 'performance', 'seo'],
        },
        {
            title: 'Excessive any typing across codebase',
            description: 'Multiple files use any liberally: lib/data-service.ts, app/api/agent/route.ts, lib/scraper.ts. This defeats TypeScript safety. Define proper interfaces for all data shapes.',
            category: 'debt' as const,
            severity: 'low' as const,
            tags: ['typescript', 'code-quality'],
        },
        {
            title: 'Inconsistent error handling patterns',
            description: 'Some functions return false on error (saveArtistProfile), some return null (loadArtistProfile), some return { ok: false, error } (saveSessions), and some swallow errors silently. Should adopt consistent Result<T, E> pattern.',
            category: 'debt' as const,
            severity: 'low' as const,
            tags: ['code-quality', 'error-handling'],
        },
        {
            title: 'performLeadSearch fires two Google searches per call',
            description: 'Every lead search makes two Serper API calls (primary + secondary with broader net). This doubles API costs and latency. The secondary query may not be relevant.',
            category: 'performance' as const,
            severity: 'medium' as const,
            affectedFile: 'lib/search.ts',
            tags: ['performance', 'cost', 'api'],
        },
        {
            title: 'allLeads memo scans all sessions and messages on every change',
            description: 'The useMemo in app/page.tsx iterates every message in every session, runs regex matching, and JSON-parses embedded blocks. Re-runs whenever any session changes.',
            category: 'performance' as const,
            severity: 'medium' as const,
            affectedFile: 'app/page.tsx',
            tags: ['performance', 'react', 'memo'],
        },
        {
            title: 'Monolithic 1300+ line page component',
            description: 'The root page.tsx handles auth state, session management, persistence, scrolling, message sending, view routing, subscription logic in a single component. Should extract into custom hooks.',
            category: 'debt' as const,
            severity: 'medium' as const,
            affectedFile: 'app/page.tsx',
            tags: ['architecture', 'react', 'maintainability'],
        },
        {
            title: 'Gemini system prompt leaks internal tool trigger formats',
            description: 'The system prompt describes tool trigger formats (LEAD_SEARCH:, SCRAPE_URL:, DEEP_SEARCH:) that become exploitable via prompt injection.',
            category: 'security' as const,
            severity: 'medium' as const,
            affectedFile: 'lib/gemini.ts',
            tags: ['security', 'prompt-injection'],
        },
    ];

    for (const issue of knownIssues) {
        const id = await createIssue({
            ...issue,
            reportedBy: auth.user.id,
        });
        if (id) results.issues++;
    }

    return NextResponse.json({
        message: `Seeded ${results.skills} skills and ${results.issues} issues`,
        ...results,
    });
}
