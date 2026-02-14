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

        // Check if profile already exists (to avoid resetting credits on re-bootstrap)
        const { data: existing } = await supabaseAdmin
            .from('profiles')
            .select('id, credits_balance, subscription_tier')
            .eq('id', auth.user.id)
            .maybeSingle();

        if (existing) {
            // Profile exists - just update name/email, don't reset credits
            const { error } = await supabaseAdmin
                .from('profiles')
                .update({
                    email,
                    name,
                    updated_at: new Date().toISOString()
                })
                .eq('id', auth.user.id);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            // If credits_balance is 0 and no reset date, seed initial credits
            if ((existing.credits_balance ?? 0) === 0) {
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
        } else {
            // New profile - create with initial credits
            const tier: SubscriptionTier = 'artist';
            const initialCredits = PLAN_CREDITS[tier];

            const { error } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: auth.user.id,
                    email,
                    name,
                    subscription_tier: tier,
                    subscription_status: 'active',
                    credits_balance: initialCredits,
                    credits_used: 0,
                    credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Bootstrap failed' }, { status: 500 });
    }
}

