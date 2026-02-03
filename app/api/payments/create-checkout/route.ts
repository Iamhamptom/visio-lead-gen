import { NextRequest, NextResponse } from 'next/server';
import { createYocoCheckout, PlanTier, PLAN_PRICING } from '@/lib/yoco';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tier, email } = body;

        // Validate tier - only paid tiers can be purchased
        const validPaidTiers = ['starter', 'artiste', 'starter_label', 'label', 'agency'];
        if (!tier || !validPaidTiers.includes(tier)) {
            return NextResponse.json(
                { error: `Invalid tier. Available plans: ${validPaidTiers.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate pricing exists
        if (PLAN_PRICING[tier as PlanTier] <= 0) {
            return NextResponse.json(
                { error: 'This plan is not available for online checkout.' },
                { status: 400 }
            );
        }

        // Get base URL for callbacks
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
            request.headers.get('origin') ||
            'http://localhost:3000';

        // Create Yoco checkout session
        const checkout = await createYocoCheckout({
            tier: tier as PlanTier,
            email,
            successUrl: `${baseUrl}/payment-success?tier=${tier}`,
            cancelUrl: `${baseUrl}/payment-cancelled`,
            failureUrl: `${baseUrl}/payment-cancelled?error=failed`
        });

        return NextResponse.json({
            success: true,
            checkoutId: checkout.id,
            redirectUrl: checkout.redirectUrl,
            amount: checkout.amount,
            currency: checkout.currency
        });

    } catch (error: any) {
        console.error('Create checkout error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
