import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/bookings/[id]/export — export contacts as CSV
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auth = await requireUser(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: campaign } = await supabaseAdmin
        .from('booking_campaigns')
        .select('title')
        .eq('id', id)
        .eq('user_id', auth.user.id)
        .maybeSingle();

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const { data: contacts } = await supabaseAdmin
        .from('booking_contacts')
        .select('*')
        .eq('campaign_id', id)
        .eq('user_id', auth.user.id)
        .order('type', { ascending: true });

    if (!contacts || contacts.length === 0) {
        return NextResponse.json({ error: 'No contacts to export' }, { status: 404 });
    }

    const headers = ['Name', 'Company', 'Role', 'Type', 'Email', 'Phone', 'City', 'Country', 'Region', 'Website', 'LinkedIn', 'Capacity', 'Genres', 'Verified', 'Outreach Status', 'Notes'];
    const escape = (v: any) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = contacts.map(c => [
        c.name, c.company, c.role, c.type, c.email || '', c.phone || '',
        c.city, c.country, c.region || '', c.website || '', c.linkedin || '',
        c.capacity || '', (c.genres || []).join('; '), c.verified ? 'Yes' : 'No',
        c.outreach_status, c.notes || ''
    ].map(escape).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `${campaign.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}_contacts.csv`;

    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}
