import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type CheckResult = { ok: true } | { ok: false; error: string };

async function checkTable(table: string): Promise<CheckResult> {
    try {
        const { error } = await supabaseAdmin.from(table).select('id').limit(1);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e?.message || 'Unknown error' };
    }
}

export async function GET() {
    const tables = [
        'profiles',
        'artist_profiles',
        'sessions',
        'messages',
        'saved_leads',
        'invoices'
    ];

    const results: Record<string, CheckResult> = {};

    // Check service-role auth is valid by hitting a lightweight DB query.
    for (const t of tables) {
        results[t] = await checkTable(t);
    }

    const ok = Object.values(results).every(r => r.ok);

    return NextResponse.json({
        ok,
        supabaseProjectRef: process.env.NEXT_PUBLIC_SUPABASE_URL
            ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
            : null,
        results,
        hint: ok
            ? 'DB looks initialized.'
            : 'If you see errors like "Could not find the table ... in the schema cache", run supabase/schema.sql in the Supabase SQL editor for this project.'
    });
}

