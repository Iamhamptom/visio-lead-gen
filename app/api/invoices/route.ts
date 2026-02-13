import { NextRequest, NextResponse } from 'next/server';
import {
    getInvoices,
    getInvoicesByEmail,
    createInvoice
} from '@/lib/database';
import { PLAN_NAMES, PLAN_PRICING, PlanTier } from '@/lib/yoco';
import { isAdminUser, requireAdmin, requireUser } from '@/lib/api-auth';

// GET /api/invoices - List invoices (optionally filtered by email)
export async function GET(request: NextRequest) {
    try {
        const auth = await requireUser(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(request.url);
        const emailParam = searchParams.get('email');

        let invoices;
        if (isAdminUser(auth.user)) {
            invoices = emailParam ? await getInvoicesByEmail(emailParam) : await getInvoices();
        } else {
            const email = auth.user.email;
            if (!email) {
                return NextResponse.json({ error: 'User email missing' }, { status: 400 });
            }
            invoices = await getInvoicesByEmail(email);
        }

        // Sort by created date, newest first
        invoices.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

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
            subscriberId,
            email,
            tier,
            status = 'pending',
            yocoCheckoutId,
            yocoPaymentId
        } = body;

        if (!email || !tier) {
            return NextResponse.json(
                { error: 'Email and tier are required' },
                { status: 400 }
            );
        }

        // Get amount from pricing
        const amount = PLAN_PRICING[tier as PlanTier] || 0;
        const planName = PLAN_NAMES[tier as PlanTier] || tier;

        const invoice = await createInvoice({
            subscriberId: subscriberId || email,
            email,
            tier,
            status,
            amount,
            currency: 'ZAR',
            lineItems: [{
                description: `${planName} - Monthly Subscription`,
                amount,
                quantity: 1
            }],
            yocoCheckoutId,
            yocoPaymentId
        });

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
