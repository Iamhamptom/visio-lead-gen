import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PLAN_NAMES, PLAN_PRICING, PlanTier } from '@/lib/yoco';
import { isAdminUser, requireAdmin, requireUser } from '@/lib/api-auth';

function makeInvoiceNumber() {
    const year = new Date().getFullYear();
    const suffix = crypto.randomUUID ? crypto.randomUUID().split('-')[0] : crypto.randomBytes(6).toString('hex');
    return `INV-${year}-${suffix}`;
}

// GET /api/invoices - List invoices (optionally filtered by email)
export async function GET(request: NextRequest) {
    try {
        const auth = await requireUser(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(request.url);
        const emailParam = searchParams.get('email');

        const admin = isAdminUser(auth.user);
        let userIdFilter: string | null = null;

        if (admin && emailParam) {
            const normalizedEmail = emailParam.trim().toLowerCase();
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id, email')
                .eq('email', normalizedEmail)
                .maybeSingle();
            userIdFilter = profile?.id ?? null;

            // Fallback if emails were stored with mixed case.
            if (!userIdFilter && normalizedEmail !== emailParam) {
                const { data: profile2 } = await supabaseAdmin
                    .from('profiles')
                    .select('id, email')
                    .eq('email', emailParam)
                    .maybeSingle();
                userIdFilter = profile2?.id ?? null;
            }
        }

        if (!admin) {
            // Non-admins can only see their own invoices.
            userIdFilter = auth.user.id;
        }

        let query = supabaseAdmin
            .from('invoices')
            .select('*')
            .order('created_at', { ascending: false });

        if (userIdFilter) {
            query = query.eq('user_id', userIdFilter);
        }

        const { data: rows, error } = await query.limit(200);
        if (error) throw error;

        const invoices = (rows || []).map((r: any) => ({
            id: r.id,
            invoiceNumber: r.invoice_number,
            tier: r.tier,
            planName: PLAN_NAMES[r.tier as PlanTier] || r.tier,
            amount: r.amount,
            currency: r.currency,
            status: r.status,
            yocoCheckoutId: r.yoco_checkout_id,
            yocoPaymentId: r.yoco_payment_id,
            paidAt: r.paid_at,
            createdAt: r.created_at
        }));

        return NextResponse.json({
            invoices,
            total: invoices.length
        });
    } catch (error: any) {
        console.error('Get invoices error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch invoices' },
            { status: 500 }
        );
    }
}

// POST /api/invoices - Create a new invoice
export async function POST(request: NextRequest) {
    try {
        const admin = await requireAdmin(request);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.error }, { status: admin.status });
        }

        const body = await request.json();
        const {
            userId,
            email,
            tier,
            status = 'pending',
            yocoCheckoutId,
            yocoPaymentId
        } = body;

        if (!tier || typeof tier !== 'string') {
            return NextResponse.json(
                { error: 'Tier is required' },
                { status: 400 }
            );
        }

        let targetUserId = typeof userId === 'string' && userId.length > 0 ? userId : null;
        if (!targetUserId && typeof email === 'string' && email.length > 3) {
            const normalizedEmail = email.trim().toLowerCase();
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id, email')
                .eq('email', normalizedEmail)
                .maybeSingle();
            targetUserId = profile?.id ?? null;
        }

        if (!targetUserId) {
            return NextResponse.json({ error: 'userId or email is required' }, { status: 400 });
        }

        // Get amount from pricing
        const amount = PLAN_PRICING[tier as PlanTier] || 0;
        const planName = PLAN_NAMES[tier as PlanTier] || tier;

        const invoiceNumber = makeInvoiceNumber();
        const paidAt = status === 'paid' ? new Date().toISOString() : null;

        const { data: inserted, error: insertError } = await supabaseAdmin
            .from('invoices')
            .insert({
                user_id: targetUserId,
                invoice_number: invoiceNumber,
                tier,
                amount,
                currency: 'ZAR',
                status,
                yoco_checkout_id: yocoCheckoutId || null,
                yoco_payment_id: yocoPaymentId || null,
                paid_at: paidAt
            })
            .select('*')
            .single();

        if (insertError) throw insertError;

        const invoice = {
            id: inserted.id,
            invoiceNumber: inserted.invoice_number,
            tier: inserted.tier,
            planName: planName,
            amount: inserted.amount,
            currency: inserted.currency,
            status: inserted.status,
            yocoCheckoutId: inserted.yoco_checkout_id,
            yocoPaymentId: inserted.yoco_payment_id,
            paidAt: inserted.paid_at,
            createdAt: inserted.created_at
        };

        return NextResponse.json({
            success: true,
            invoice
        });
    } catch (error: any) {
        console.error('Create invoice error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create invoice' },
            { status: 500 }
        );
    }
}
