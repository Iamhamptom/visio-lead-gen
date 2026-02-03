import { NextRequest, NextResponse } from 'next/server';
import {
    upsertSubscriberByEmail,
    createInvoice,
    createTransaction,
    updateInvoice,
    getInvoicesByEmail
} from '@/lib/database';
import { PLAN_NAMES, PLAN_PRICING, PlanTier } from '@/lib/yoco';

/**
 * Yoco Webhook Handler
 * Receives payment confirmation events from Yoco
 * 
 * Webhook events:
 * - checkout.completed: Payment was successful
 * - checkout.expired: Checkout session expired
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('[Yoco Webhook] Received event:', JSON.stringify(body, null, 2));

        const { type, payload } = body;

        switch (type) {
            case 'checkout.completed': {
                const { id: checkoutId, paymentId, amount, metadata } = payload;
                const tier = metadata?.tier as PlanTier;
                const userId = metadata?.userId;
                const email = metadata?.email;

                console.log(`[Yoco Webhook] Payment completed!`);
                console.log(`- Checkout ID: ${checkoutId}`);
                console.log(`- Payment ID: ${paymentId}`);
                console.log(`- Tier: ${tier}`);
                console.log(`- User: ${userId}`);
                console.log(`- Email: ${email}`);

                // Create transaction record
                await createTransaction({
                    type: 'payment_success',
                    checkoutId,
                    paymentId,
                    subscriberId: userId || email,
                    amount: amount || PLAN_PRICING[tier] || 0,
                    currency: 'ZAR',
                    status: 'completed',
                    rawWebhookData: payload
                });

                if (email && tier) {
                    // Calculate renewal date (1 month from now)
                    const renewalDate = new Date();
                    renewalDate.setMonth(renewalDate.getMonth() + 1);

                    // Upsert subscriber record
                    const subscriber = await upsertSubscriberByEmail(email, {
                        email,
                        name: userId !== 'anonymous' ? userId : undefined,
                        tier,
                        status: 'active',
                        renewalDate: renewalDate.toISOString(),
                        yocoCustomerId: paymentId
                    });

                    console.log(`[Yoco Webhook] Subscriber upserted:`, subscriber.id);

                    // Create paid invoice
                    const planName = PLAN_NAMES[tier] || tier;
                    const invoiceAmount = amount || PLAN_PRICING[tier] || 0;

                    const invoice = await createInvoice({
                        subscriberId: subscriber.id,
                        email,
                        tier,
                        status: 'paid',
                        amount: invoiceAmount,
                        currency: 'ZAR',
                        lineItems: [{
                            description: `${planName} - Monthly Subscription`,
                            amount: invoiceAmount,
                            quantity: 1
                        }],
                        paidAt: new Date().toISOString(),
                        yocoCheckoutId: checkoutId,
                        yocoPaymentId: paymentId
                    });

                    console.log(`[Yoco Webhook] Invoice created:`, invoice.invoiceNumber);
                }

                break;
            }

            case 'checkout.expired': {
                const { id: checkoutId, metadata } = payload;
                const email = metadata?.email;

                console.log(`[Yoco Webhook] Checkout expired: ${checkoutId}`);

                // Record failed transaction
                await createTransaction({
                    type: 'payment_failed',
                    checkoutId,
                    subscriberId: email,
                    amount: 0,
                    currency: 'ZAR',
                    status: 'expired',
                    rawWebhookData: payload
                });

                break;
            }

            default:
                console.log(`[Yoco Webhook] Unhandled event type: ${type}`);
        }

        // Always return 200 to acknowledge receipt
        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error('[Yoco Webhook] Error:', error);
        // Return 200 anyway to prevent Yoco retries for parsing errors
        return NextResponse.json({ received: true, error: error.message });
    }
}

// Yoco may send GET requests for webhook validation
export async function GET() {
    return NextResponse.json({ status: 'Yoco webhook endpoint active' });
}
