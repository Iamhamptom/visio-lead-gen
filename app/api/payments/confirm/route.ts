import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getYocoCheckout, PlanTier, PLAN_PRICING } from '@/lib/yoco';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/api-auth';
import { PLAN_CREDITS } from '@/lib/credits';
import { SubscriptionTier } from '@/app/types';

function makeInvoiceNumber() {
    const year = new Date().getFullYear();
    const suffix = crypto.randomUUID ? crypto.randomUUID().split('-')[0] : crypto.randomBytes(6).toString('hex');
    return `INV-${year}-${suffix}`;
}

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

        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const creditsResetAt = periodEnd;
        const rawCredits = PLAN_CREDITS[tier as SubscriptionTier] ?? 20;
        const creditsToSet = rawCredits === Infinity ? 999999 : rawCredits;
        const normalizedEmail = (auth.user.email || '').trim().toLowerCase();
        const nameFromMeta =
            typeof auth.user.user_metadata?.name === 'string'
                ? auth.user.user_metadata.name
                : typeof auth.user.user_metadata?.full_name === 'string'
                    ? auth.user.user_metadata.full_name
                    : null;

        // 3. Upsert profile so paid users are always assigned to the paid tier.
        const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', auth.user.id)
            .maybeSingle();

        if (profileLookupError) throw profileLookupError;

        if (!existingProfile) {
            const { error: insertProfileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: auth.user.id,
                    email: normalizedEmail,
                    name: nameFromMeta,
                    subscription_tier: tier,
                    subscription_status: 'active',
                    subscription_period_end: periodEnd,
                    credits_balance: creditsToSet,
                    credits_used: 0,
                    credits_reset_at: creditsResetAt,
                    updated_at: new Date().toISOString()
                });
            if (insertProfileError) throw insertProfileError;
        } else {
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    subscription_tier: tier,
                    subscription_status: 'active',
                    subscription_period_end: periodEnd,
                    credits_balance: creditsToSet,
                    credits_used: 0,
                    credits_reset_at: creditsResetAt,
                    updated_at: new Date().toISOString()
                })
                .eq('id', auth.user.id);

            if (updateError) throw updateError;
        }

        // 3b. Mark user as approved so the UI restriction gate is lifted for paid users.
        try {
            await supabaseAdmin.auth.admin.updateUserById(auth.user.id, {
                app_metadata: { approved: true }
            });
        } catch (approveErr) {
            console.error('Failed to set approved flag after payment:', approveErr);
            // Non-fatal: the client-side isRestricted check also considers paid tier
        }

        // 4. Create a paid invoice if this checkout hasn't been recorded yet.
        let invoiceCreated = false;
        const paymentId = typeof checkout.paymentId === 'string' ? checkout.paymentId : null;

        const { data: byCheckout } = await supabaseAdmin
            .from('invoices')
            .select('id')
            .eq('user_id', auth.user.id)
            .eq('yoco_checkout_id', checkoutId)
            .limit(1)
            .maybeSingle();

        let alreadyExists = !!byCheckout;
        if (!alreadyExists && paymentId) {
            const { data: byPayment } = await supabaseAdmin
                .from('invoices')
                .select('id')
                .eq('user_id', auth.user.id)
                .eq('yoco_payment_id', paymentId)
                .limit(1)
                .maybeSingle();
            alreadyExists = !!byPayment;
        }

        if (!alreadyExists) {
            const amount = typeof checkout.amount === 'number' ? checkout.amount : PLAN_PRICING[tier] || 0;
            const { error: invoiceError } = await supabaseAdmin
                .from('invoices')
                .insert({
                    user_id: auth.user.id,
                    invoice_number: makeInvoiceNumber(),
                    tier,
                    amount,
                    currency: 'ZAR',
                    status: 'paid',
                    yoco_checkout_id: checkoutId,
                    yoco_payment_id: paymentId,
                    paid_at: new Date().toISOString()
                });

            if (!invoiceError) {
                invoiceCreated = true;
            } else {
                console.error('Invoice create failed in confirm route:', invoiceError);
            }
        }

        return NextResponse.json({ success: true, tier, invoiceCreated });

    } catch (error: any) {
        console.error('Payment confirm error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
