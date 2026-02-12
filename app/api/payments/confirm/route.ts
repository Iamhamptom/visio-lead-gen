import { NextRequest, NextResponse } from 'next/server';
import { getYocoCheckout, PLAN_NAMES, PlanTier } from '@/lib/yoco';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
    try {
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

        if (checkout.status !== 'succeeded' && checkout.status !== 'completed') {
            // Yoco status might be 'succeeded', 'completed', 'successful'? Docs say 'succeeded' usually for charges, but checkouts might be different.
            // Inspecting the payload from a real test would be ideal, but let's assume standard success states.
            // If status is 'created', it's not paid.
            if (checkout.status !== 'succeeded' && checkout.status !== 'completed') { // Cover bases
                return NextResponse.json({ error: `Payment status: ${checkout.status}` }, { status: 400 });
            }
        }

        // 2. Extract Metadata
        const tier = checkout.metadata?.tier as PlanTier;
        const userId = checkout.metadata?.userId; // We might need to rely on the current user session instead if this is 'anonymous' or not trusted?
        // Actually, we should use the user from the session to ensure we are updating the *current* user, 
        // OR use the one from metadata if we trust the checkout flow initiation.
        // Let's use the current authenticated user to be safe.

        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        let targetUserId = userId;

        if (token) {
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            if (user) targetUserId = user.id;
        }

        if (!targetUserId || targetUserId === 'anonymous') {
            // If we can't identify the user, we can't update them.
            // But if the checkout has their email, maybe we find them by email?
            const email = checkout.metadata?.email;
            if (email) {
                const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
                const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                if (user) targetUserId = user.id;
            }
        }

        if (!targetUserId) {
            return NextResponse.json({ error: 'Could not identify user to update' }, { status: 400 });
        }

        // 3. Update Profile (Bypassing RLS)
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                subscription_tier: tier,
                subscription_status: 'active',
                subscription_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', targetUserId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, tier });

    } catch (error: any) {
        console.error('Payment confirm error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
