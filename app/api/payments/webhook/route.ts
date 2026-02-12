import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PLAN_NAMES, PlanTier } from '@/lib/yoco';

// Yoco Webhook Handler
export async function POST(req: NextRequest) {
    try {
        const event = await req.json();

        // 1. Basic Validation (In prod, verify signature if Yoco provides one)
        if (!event.type || !event.payload) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        console.log(`Webhook received: ${event.type}`, event.id);

        // 2. Handle Payment Success
        if (event.type === 'payment.succeeded') {
            const payment = event.payload;
            const metadata = payment.metadata || {};

            // Extract info
            const userId = metadata.userId;
            const tier = metadata.tier as PlanTier;
            const email = metadata.email;

            if (!tier) {
                console.warn('Webhook: Missing tier in metadata', payment.id);
                return NextResponse.json({ message: 'Ignored: No tier' });
            }

            // identify user
            let targetUserId = userId;
            if (!targetUserId || targetUserId === 'anonymous') {
                if (email) {
                    // Try find by email
                    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
                    const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                    if (found) targetUserId = found.id;
                }
            }

            if (!targetUserId) {
                console.error('Webhook: Could not identify user', metadata);
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // 3. Update Subscription
            const { error } = await supabaseAdmin
                .from('profiles')
                .update({
                    subscription_tier: tier,
                    subscription_status: 'active',
                    subscription_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                })
                .eq('id', targetUserId);

            if (error) {
                console.error('Webhook: DB update failed', error);
                return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
            }

            // 4. Send Email (Optional, can be duplicate of success page but safer here)
            // We usually let the success page handle the immediate feedback, but webhook is the source of truth.
            // Let's send a "Receipt" email here eventually. For now, just logging.
            console.log(`Webhook: Upgraded ${targetUserId} to ${tier}`);

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ message: `Ignored event: ${event.type}` });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
