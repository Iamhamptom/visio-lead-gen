import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PLAN_CREDITS } from '@/lib/credits';
import { SubscriptionTier } from '@/app/types';

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

        // Check if profile already exists — only select columns guaranteed to exist
        const { data: existing, error: selectError } = await supabaseAdmin
            .from('profiles')
            .select('id, subscription_tier')
            .eq('id', auth.user.id)
            .maybeSingle();

        // If the select itself fails (e.g. missing table), still try to upsert
        if (selectError) {
            console.warn('Profile select failed, attempting upsert:', selectError.message);
        }

        if (existing) {
            // Profile exists — update name/email
            await supabaseAdmin
                .from('profiles')
                .update({
                    email,
                    name,
                    updated_at: new Date().toISOString()
                })
                .eq('id', auth.user.id);

            // Try to seed credits if the column exists and balance is 0
            try {
                const { data: creditCheck } = await supabaseAdmin
                    .from('profiles')
                    .select('credits_balance')
                    .eq('id', auth.user.id)
                    .maybeSingle();

                if (creditCheck && (creditCheck.credits_balance ?? 0) === 0) {
                    const tier = (existing.subscription_tier || 'artist') as SubscriptionTier;
                    const allocation = PLAN_CREDITS[tier];
                    const credits = allocation === Infinity ? 99999 : allocation;
                    await supabaseAdmin
                        .from('profiles')
                        .update({
                            credits_balance: credits,
                            credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                        })
                        .eq('id', auth.user.id);
                }
            } catch {
                // credits columns may not exist yet — non-fatal
            }
        } else {
            // New profile — create with basic fields first
            const tier: SubscriptionTier = 'artist';
            const initialCredits = PLAN_CREDITS[tier];

            const insertPayload: Record<string, any> = {
                id: auth.user.id,
                email,
                name,
                subscription_tier: tier,
                subscription_status: 'active',
                updated_at: new Date().toISOString()
            };

            // Try inserting with credit columns
            const { error: insertErr } = await supabaseAdmin
                .from('profiles')
                .insert({
                    ...insertPayload,
                    credits_balance: initialCredits,
                    credits_used: 0,
                    credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                });

            // If insert failed due to missing credit columns, retry without them
            if (insertErr) {
                const { error: fallbackErr } = await supabaseAdmin
                    .from('profiles')
                    .insert(insertPayload);

                if (fallbackErr) {
                    return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
                }
            }
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Bootstrap failed' }, { status: 500 });
    }
}
