import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/api-auth';
import { PLAN_CREDITS } from '@/lib/credits';
import { SubscriptionTier } from '@/app/types';

export async function POST(req: Request) {
    try {
        const admin = await requireAdmin(req);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.error }, { status: admin.status });
        }
        const { userId, approved } = await req.json();

        if (typeof userId !== 'string' || userId.length < 10) {
            return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
        }
        if (typeof approved !== 'boolean') {
            return NextResponse.json({ error: 'Invalid approved flag' }, { status: 400 });
        }

        // 2. Update User Metadata
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { app_metadata: { approved: approved } }
        );

        if (error) throw error;

        // 3. When approving, ensure the user has credits assigned
        if (approved) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('subscription_tier, credits_balance')
                .eq('id', userId)
                .maybeSingle();

            if (profile) {
                const tier = (profile.subscription_tier || 'artist') as SubscriptionTier;
                const allocation = PLAN_CREDITS[tier];
                const credits = allocation === Infinity ? 99999 : allocation;

                // Only seed credits if balance is 0 (don't override existing balance)
                if ((profile.credits_balance ?? 0) === 0) {
                    await supabaseAdmin
                        .from('profiles')
                        .update({
                            credits_balance: credits,
                            credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                        })
                        .eq('id', userId);
                }
            }
        }

        return NextResponse.json({ user: data.user });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
