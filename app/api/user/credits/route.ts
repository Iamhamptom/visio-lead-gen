import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { getUserCredits, PLAN_CREDITS } from '@/lib/credits';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SubscriptionTier } from '@/app/types';

export async function GET(request: NextRequest) {
    try {
        const auth = await requireUser(request);
        if (!auth.ok) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const balance = await getUserCredits(auth.user.id);

        // Get subscription tier for monthly allocation info
        let tier: SubscriptionTier = 'artist';
        try {
            const supabase = await createSupabaseServerClient();
            const { data } = await supabase
                .from('profiles')
                .select('subscription_tier')
                .eq('id', auth.user.id)
                .single();
            if (data?.subscription_tier) tier = data.subscription_tier as SubscriptionTier;
        } catch { /* fallback to artist */ }

        const monthlyAllocation = PLAN_CREDITS[tier];

        return NextResponse.json({
            balance,
            monthlyAllocation: monthlyAllocation === Infinity ? 'unlimited' : monthlyAllocation,
            tier,
        });
    } catch (error: any) {
        console.error('[Credits] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
    }
}
