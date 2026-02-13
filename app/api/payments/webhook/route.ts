import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PLAN_PRICING, type PlanTier } from '@/lib/yoco';

function getSignatureHeader(req: NextRequest) {
    return (
        req.headers.get('x-yoco-signature') ||
        req.headers.get('x-signature') ||
        req.headers.get('yoco-signature') ||
        ''
    );
}

function parseSignature(sig: string): Buffer | null {
    const clean = sig.replace(/^sha256=/i, '').trim();
    if (!clean) return null;

    // Hex (64 chars) or base64.
    if (/^[0-9a-fA-F]{64}$/.test(clean)) return Buffer.from(clean, 'hex');
    try {
        const b = Buffer.from(clean, 'base64');
        return b.length ? b : null;
    } catch {
        return null;
    }
}

function verifySignature(raw: Buffer, sigHeader: string, secret: string) {
    const provided = parseSignature(sigHeader);
    if (!provided) return false;

    const expected = crypto.createHmac('sha256', secret).update(raw).digest();
    if (provided.length !== expected.length) return false;

    return crypto.timingSafeEqual(provided, expected);
}

function makeInvoiceNumber() {
    const year = new Date().getFullYear();
    const suffix = crypto.randomUUID ? crypto.randomUUID().split('-')[0] : crypto.randomBytes(6).toString('hex');
    return `INV-${year}-${suffix}`;
}

// Yoco Webhook Handler
export async function POST(req: NextRequest) {
    try {
        const secret = process.env.YOCO_WEBHOOK_SECRET;
        if (!secret) {
            return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
        }

        // Verify signature using the raw request body to prevent spoofing.
        const raw = Buffer.from(await req.arrayBuffer());
        const signatureHeader = getSignatureHeader(req);
        if (!verifySignature(raw, signatureHeader, secret)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const event = JSON.parse(raw.toString('utf8')) as any;
        if (!event?.type || !event?.payload) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const type = String(event.type);
        const payload = event.payload as any;

        const successTypes = new Set(['checkout.completed', 'payment.succeeded']);
        if (!successTypes.has(type)) {
            return NextResponse.json({ received: true, message: `Ignored event: ${type}` });
        }

        // Supports both legacy `payment.succeeded` and Checkout API `checkout.completed`.
        const metadata = payload?.metadata || payload?.payment?.metadata || {};
        const tier = metadata?.tier as PlanTier | undefined;
        const email = typeof metadata?.email === 'string' ? metadata.email.trim() : '';
        const userId = typeof metadata?.userId === 'string' ? metadata.userId.trim() : '';

        if (!tier) {
            return NextResponse.json({ received: true, message: 'Ignored: missing tier' });
        }

        // Identify target user
        let targetUserId: string | null = userId && userId !== 'anonymous' ? userId : null;
        if (!targetUserId && email) {
            const normalizedEmail = email.toLowerCase();
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id, email')
                .eq('email', normalizedEmail)
                .maybeSingle();
            targetUserId = profile?.id ?? null;

            // Fallback: if emails were stored with mixed case, try the raw email.
            if (!targetUserId) {
                const { data: profile2 } = await supabaseAdmin
                    .from('profiles')
                    .select('id, email')
                    .eq('email', email)
                    .maybeSingle();
                targetUserId = profile2?.id ?? null;
            }

            // Final fallback: search Auth users (small user bases only).
            if (!targetUserId) {
                const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
                const found = users.find(u => (u.email || '').toLowerCase() === normalizedEmail);
                targetUserId = found?.id ?? null;
            }
        }

        if (!targetUserId) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Update subscription (source of truth)
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                subscription_tier: tier,
                subscription_status: 'active',
                subscription_period_end: periodEnd,
                updated_at: new Date().toISOString()
            })
            .eq('id', targetUserId);

        if (profileError) {
            console.error('[Yoco Webhook] Profile update failed:', profileError);
            return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        // Create invoice record (best-effort; do not fail webhook if invoice insert fails).
        const checkoutId = typeof payload?.id === 'string' ? payload.id : null;
        const paymentId = typeof payload?.paymentId === 'string' ? payload.paymentId : null;
        const amount = typeof payload?.amount === 'number' ? payload.amount : PLAN_PRICING[tier] || 0;

        if (amount > 0) {
            const { error: invoiceError } = await supabaseAdmin
                .from('invoices')
                .insert({
                    user_id: targetUserId,
                    invoice_number: makeInvoiceNumber(),
                    tier,
                    amount,
                    currency: 'ZAR',
                    status: 'paid',
                    yoco_checkout_id: checkoutId,
                    yoco_payment_id: paymentId,
                    paid_at: new Date().toISOString()
                });

            if (invoiceError) {
                console.error('[Yoco Webhook] Invoice insert failed:', invoiceError);
            }
        }

        return NextResponse.json({ received: true, type });

    } catch (error: any) {
        console.error('[Yoco Webhook] Error:', error);
        return NextResponse.json({ error: error.message || 'Webhook error' }, { status: 500 });
    }
}

// Some providers send GET requests for webhook validation
export async function GET() {
    return NextResponse.json({ status: 'Yoco webhook endpoint active' });
}
