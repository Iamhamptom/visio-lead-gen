import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/api-auth';
import { PLAN_CREDITS } from '@/lib/credits';
import { SubscriptionTier } from '@/app/types';
import { PLAN_PRICING, PlanTier } from '@/lib/yoco';

export const dynamic = 'force-dynamic';

function makeInvoiceNumber() {
    const year = new Date().getFullYear();
    const suffix = crypto.randomUUID ? crypto.randomUUID().split('-')[0] : crypto.randomBytes(6).toString('hex');
    return `INV-${year}-${suffix}`;
}

export async function POST(req: Request) {
    try {
        const admin = await requireAdmin(req);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.error }, { status: admin.status });
        }

        // Parse Body
        const { userId, tier, status } = await req.json();

        if (typeof userId !== 'string' || userId.length < 10) {
            return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
        }
        if (typeof tier !== 'string' || !tier.trim()) {
            return NextResponse.json({ error: 'Missing userId or tier' }, { status: 400 });
        }

        const allowedTiers = new Set(['artist', 'starter', 'artiste', 'starter_label', 'label', 'agency', 'enterprise']);
        if (!allowedTiers.has(tier)) {
            return NextResponse.json({ error: `Invalid tier: ${tier}` }, { status: 400 });
        }

        const allowedStatuses = new Set(['active', 'trialing', 'past_due', 'canceled']);
        if (status && (typeof status !== 'string' || !allowedStatuses.has(status))) {
            return NextResponse.json({ error: `Invalid status: ${String(status)}` }, { status: 400 });
        }

        // Ensure profile row exists (admin users can exist in auth without a profiles row).
        const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

        if (existingProfileError) {
            console.error('Profile lookup error:', existingProfileError);
            return NextResponse.json({ error: 'Failed to verify profile' }, { status: 500 });
        }

        let createdProfile = false;
        if (!existingProfile) {
            const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
            if (authUserError || !authUserData?.user) {
                return NextResponse.json({ error: 'User not found in auth records' }, { status: 404 });
            }

            const authEmail = (authUserData.user.email || '').trim().toLowerCase() || `${userId}@no-email.local`;
            const authName =
                typeof authUserData.user.user_metadata?.name === 'string'
                    ? authUserData.user.user_metadata.name
                    : typeof authUserData.user.user_metadata?.full_name === 'string'
                        ? authUserData.user.user_metadata.full_name
                        : null;

            const { error: createProfileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: userId,
                    email: authEmail,
                    name: authName,
                    subscription_tier: 'artist',
                    subscription_status: 'active',
                    updated_at: new Date().toISOString()
                });

            if (createProfileError) {
                console.error('Profile create error during subscription update:', createProfileError);
                return NextResponse.json({ error: 'Failed to create profile for user' }, { status: 500 });
            }
            createdProfile = true;
        }

        // 4. Update Profile with credits allocation for the new tier
        const allocation = PLAN_CREDITS[tier as SubscriptionTier];
        const newCredits = allocation === Infinity ? 99999 : allocation;

        const updates: any = {
            subscription_tier: tier,
            subscription_status: status || 'active',
            credits_balance: newCredits,
            credits_used: 0,
            credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
        };

        // If activating, extend period
        if (status === 'active' || !status) {
            updates.subscription_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        const { data: updatedRows, error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select('id');

        if (updateError) {
            console.error('Update subscription error:', updateError);
            return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
        }
        if (!updatedRows || updatedRows.length === 0) {
            return NextResponse.json({ error: 'No profile row was updated' }, { status: 500 });
        }

        // Optionally record manual billing history so admin-granted paid access is traceable.
        const effectiveStatus = (status || 'active') as string;
        const isPaidTier = tier !== 'artist' && tier !== 'enterprise';
        let manualInvoiceCreated = false;

        if (isPaidTier && effectiveStatus === 'active') {
            const planAmount = PLAN_PRICING[tier as PlanTier] || 0;
            if (planAmount > 0) {
                const recentCutoff = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
                const { data: recentMatchingInvoice } = await supabaseAdmin
                    .from('invoices')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('status', 'paid')
                    .eq('tier', tier)
                    .gte('created_at', recentCutoff)
                    .limit(1)
                    .maybeSingle();

                if (!recentMatchingInvoice) {
                    const { error: invoiceError } = await supabaseAdmin
                        .from('invoices')
                        .insert({
                            user_id: userId,
                            invoice_number: makeInvoiceNumber(),
                            tier,
                            amount: planAmount,
                            currency: 'ZAR',
                            status: 'paid',
                            yoco_checkout_id: `manual-admin-${Date.now()}`,
                            yoco_payment_id: null,
                            paid_at: new Date().toISOString()
                        });

                    if (!invoiceError) {
                        manualInvoiceCreated = true;
                    } else {
                        console.error('Manual invoice insert failed during admin plan update:', invoiceError);
                    }
                }
            }
        }

        return NextResponse.json({ success: true, updates, createdProfile, manualInvoiceCreated });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
