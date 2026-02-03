import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceById } from '@/lib/database';
import { PLAN_NAMES, PlanTier } from '@/lib/yoco';

// GET /api/invoices/[id] - Get single invoice details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const invoice = await getInvoiceById(id);

        if (!invoice) {
            return NextResponse.json(
                { error: 'Invoice not found' },
                { status: 404 }
            );
        }

        // Enrich with display-friendly data
        const planName = PLAN_NAMES[invoice.tier as PlanTier] || invoice.tier;
        const amountFormatted = `R${(invoice.amount / 100).toLocaleString('en-ZA', {
            minimumFractionDigits: 2
        })}`;

        return NextResponse.json({
            ...invoice,
            planName,
            amountFormatted,
            dateFormatted: new Date(invoice.createdAt).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            paidDateFormatted: invoice.paidAt
                ? new Date(invoice.paidAt).toLocaleDateString('en-ZA', {
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
