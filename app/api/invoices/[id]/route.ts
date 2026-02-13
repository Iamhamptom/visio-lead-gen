import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PLAN_NAMES, PlanTier } from '@/lib/yoco';
import { isAdminUser, requireUser } from '@/lib/api-auth';

// GET /api/invoices/[id] - Get single invoice details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireUser(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { id } = await params;
        const { data: invoice, error } = await supabaseAdmin
            .from('invoices')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;

        if (!invoice) {
            return NextResponse.json(
                { error: 'Invoice not found' },
                { status: 404 }
            );
        }

        if (!isAdminUser(auth.user)) {
            if (invoice.user_id !== auth.user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        // Enrich with display-friendly data
        const planName = PLAN_NAMES[invoice.tier as PlanTier] || invoice.tier;
        const amountFormatted = `R${(invoice.amount / 100).toLocaleString('en-ZA', {
            minimumFractionDigits: 2
        })}`;

        return NextResponse.json({
            id: invoice.id,
            invoiceNumber: invoice.invoice_number,
            tier: invoice.tier,
            amount: invoice.amount,
            currency: invoice.currency,
            status: invoice.status,
            yocoCheckoutId: invoice.yoco_checkout_id,
            yocoPaymentId: invoice.yoco_payment_id,
            paidAt: invoice.paid_at,
            createdAt: invoice.created_at,
            planName,
            amountFormatted,
            dateFormatted: new Date(invoice.created_at).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            paidDateFormatted: invoice.paid_at
                ? new Date(invoice.paid_at).toLocaleDateString('en-ZA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
                : null
        });
    } catch (error: any) {
        console.error('Get invoice error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch invoice' },
            { status: 500 }
        );
    }
}
