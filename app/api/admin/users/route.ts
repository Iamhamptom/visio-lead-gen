import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic'; // Prevent static generation attempts

export async function GET(req: Request) {
    try {
        const admin = await requireAdmin(req);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.error }, { status: admin.status });
        }

        // Fetch all users
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) throw error;

        // Fetch profiles to get subscription info
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, subscription_tier, subscription_status');

        if (profileError) console.error('Error fetching profiles:', profileError);

        // Fetch invoice/payment history for billing summaries.
        const { data: invoices, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .select('user_id, amount, status, tier, paid_at, created_at');

        if (invoiceError) console.error('Error fetching invoices:', invoiceError);

        // Map profiles by ID for easy lookup
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const billingMap = new Map<string, {
            paidInvoices: number;
            totalPaid: number;
            lastPaidAt: string | null;
            lastPaidTier: string | null;
        }>();

        for (const invoice of invoices || []) {
            if (!invoice?.user_id) continue;
            const existing = billingMap.get(invoice.user_id) || {
                paidInvoices: 0,
                totalPaid: 0,
                lastPaidAt: null,
                lastPaidTier: null
            };

            if (invoice.status === 'paid') {
                existing.paidInvoices += 1;
                existing.totalPaid += typeof invoice.amount === 'number' ? invoice.amount : 0;

                const candidateTs = invoice.paid_at || invoice.created_at || null;
                const currentTs = existing.lastPaidAt;
                if (
                    candidateTs &&
                    (!currentTs || new Date(candidateTs).getTime() > new Date(currentTs).getTime())
                ) {
                    existing.lastPaidAt = candidateTs;
                    existing.lastPaidTier = typeof invoice.tier === 'string' ? invoice.tier : null;
                }
            }

            billingMap.set(invoice.user_id, existing);
        }

        // Merge and sort by created_at desc
        const sorted = users.map(u => ({
            ...u,
            subscription: profileMap.get(u.id) || null,
            billing: billingMap.get(u.id) || {
                paidInvoices: 0,
                totalPaid: 0,
                lastPaidAt: null,
                lastPaidTier: null
            }
        })).sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return NextResponse.json({ users: sorted });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
