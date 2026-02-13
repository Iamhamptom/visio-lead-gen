import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const auth = await requireUser(req);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const email = (auth.user.email || '').trim().toLowerCase();
        if (!email) {
            return NextResponse.json({ error: 'User email missing' }, { status: 400 });
        }

        const meta = (auth.user.user_metadata || {}) as Record<string, any>;
        const name = typeof meta.name === 'string'
            ? meta.name
            : typeof meta.full_name === 'string'
                ? meta.full_name
                : null;

        // Ensure a profiles row exists for FK constraints (sessions, artist_profiles, invoices, etc.).
        const { error } = await supabaseAdmin
            .from('profiles')
            .upsert(
                {
                    id: auth.user.id,
                    email,
                    name,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'id' }
            );

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Bootstrap failed' }, { status: 500 });
    }
}

