import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { chargeYocoToken, PLAN_PRICING, PlanTier } from '@/lib/yoco';

// Vercel Cron protection
// https://vercel.com/docs/cron-jobs
function verifyCronRequest(request: NextRequest) {
    // Fail closed in production. If CRON_SECRET is not set, do not run.
    if (process.env.NODE_ENV === 'production' && !process.env.CRON_SECRET) {
        return false;
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return false;
    }
    return true;
}

function makeInvoiceNumber() {
    const year = new Date().getFullYear();
    const suffix = crypto.randomUUID ? crypto.randomUUID().split('-')[0] : crypto.randomBytes(6).toString('hex');
    return `INV-${year}-${suffix}`;
}

export async function GET(request: NextRequest) {
    if (!verifyCronRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createSupabaseAdminClient();
        const now = new Date();

        // Find subscriptions that expire(d) yesterday or today and are 'active'
        // Logic: subscription_period_end <= NOW AND subscription_status = 'active'
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, email, subscription_tier, subscription_period_end, payment_token, card_brand, card_last4')
            .eq('subscription_status', 'active')
            .lt('subscription_period_end', now.toISOString())
            .not('payment_token', 'is', null);

        if (error) throw error;

        const results = {
            total: profiles?.length || 0,
            success: 0,
            failed: 0,
            skipped: 0
        };

        if (!profiles || profiles.length === 0) {
            return NextResponse.json({ message: 'No subscriptions to renew', results });
        }

        for (const profile of profiles) {
            const tier = profile.subscription_tier as PlanTier;
            const amount = PLAN_PRICING[tier];

            // Skip free tiers or invalid pricing
            if (!amount || amount <= 0) {
                results.skipped++;
                continue;
            }

            try {
                // Attempt charge
                const chargeResult = await chargeYocoToken(profile.payment_token, amount);

                // Calculate new period end (1 month from OLD end date, or from NOW if it lapsed long ago?)
                // Usually from OLD end to keep billing cycle anchors.
                const oldEnd = new Date(profile.subscription_period_end);
                const newEnd = new Date(oldEnd);
                newEnd.setMonth(newEnd.getMonth() + 1);

                // Update Profile
                await supabase
                    .from('profiles')
                    .update({
                        subscription_period_end: newEnd.toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', profile.id);

                // Create paid invoice entry for recurring renewals.
                const renewalPaymentId =
                    typeof chargeResult?.id === 'string'
                        ? chargeResult.id
                        : typeof chargeResult?.paymentId === 'string'
                            ? chargeResult.paymentId
                            : null;

                let alreadyRecorded = false;
                if (renewalPaymentId) {
                    const { data: existingRenewalInvoice } = await supabase
                        .from('invoices')
                        .select('id')
                        .eq('user_id', profile.id)
                        .eq('yoco_payment_id', renewalPaymentId)
                        .limit(1)
                        .maybeSingle();
                    alreadyRecorded = !!existingRenewalInvoice;
                }

                if (!alreadyRecorded) {
                    const { error: invoiceError } = await supabase
                        .from('invoices')
                        .insert({
                            user_id: profile.id,
                            invoice_number: makeInvoiceNumber(),
                            tier,
                            amount,
                            currency: 'ZAR',
                            status: 'paid',
                            yoco_checkout_id: null,
                            yoco_payment_id: renewalPaymentId,
                            paid_at: new Date().toISOString()
                        });
                    if (invoiceError) {
                        console.error(`Renewal invoice insert failed for user ${profile.id}:`, invoiceError);
                    }
                }

                results.success++;

            } catch (chargeError) {
                console.error(`Renewal failed for user ${profile.id}:`, chargeError);

                // Mark as past_due
                await supabase
                    .from('profiles')
                    .update({
                        subscription_status: 'past_due',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', profile.id);

                results.failed++;
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('Cron Job Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
