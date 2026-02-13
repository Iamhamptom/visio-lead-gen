import { NextRequest, NextResponse } from 'next/server';
import { getYocoCheckout, PlanTier } from '@/lib/yoco';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
    try {
        const auth = await requireUser(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { checkoutId } = await request.json();

        if (!checkoutId) {
            return NextResponse.json({ error: 'Missing checkout ID' }, { status: 400 });
        }

        // 1. Verify with Yoco
        let checkout;
        try {
            checkout = await getYocoCheckout(checkoutId);
        } catch (err) {
            console.error('Yoco verification failed:', err);
            return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
        }

        const status = String(checkout.status);
        if (status !== 'succeeded' && status !== 'completed') {
            return NextResponse.json({ error: `Payment status: ${status}` }, { status: 400 });
        }

        // 2. Extract Metadata
        const tier = checkout.metadata?.tier as PlanTier | undefined;
        if (!tier) {
            return NextResponse.json({ error: 'Missing tier metadata' }, { status: 400 });
        }

        // Ensure the checkout belongs to the caller before updating anything.
        const metaUserId = typeof checkout.metadata?.userId === 'string' ? checkout.metadata.userId : '';
        const metaEmail = typeof checkout.metadata?.email === 'string' ? checkout.metadata.email : '';
        if (metaUserId && metaUserId !== 'anonymous' && metaUserId !== auth.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if ((!metaUserId || metaUserId === 'anonymous') && metaEmail) {
            const userEmail = auth.user.email || '';
            if (!userEmail || metaEmail.toLowerCase() !== userEmail.toLowerCase()) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        // 3. Update Profile (Bypassing RLS)
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                subscription_tier: tier,
                subscription_status: 'active',
                subscription_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', auth.user.id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, tier });

    } catch (error: any) {
        console.error('Payment confirm error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
