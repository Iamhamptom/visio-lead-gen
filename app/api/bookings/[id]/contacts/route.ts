import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// POST /api/bookings/[id]/contacts — add contacts to a campaign
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auth = await requireUser(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Verify campaign belongs to user
    const { data: campaign } = await supabaseAdmin
        .from('booking_campaigns')
        .select('id')
        .eq('id', id)
        .eq('user_id', auth.user.id)
        .maybeSingle();

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const body = await req.json();
    const contacts = Array.isArray(body.contacts) ? body.contacts : [body];

    const rows = contacts.map((c: any) => ({
        campaign_id: id,
        user_id: auth.user.id,
        name: c.name || 'Unknown',
        email: c.email || null,
        phone: c.phone || null,
        company: c.company || c.name || '',
        role: c.role || 'Contact',
        type: c.type || 'venue',
        city: c.city || '',
        country: c.country || '',
        region: c.region || null,
        website: c.website || null,
        linkedin: c.linkedin || null,
        socials: c.socials || {},
        capacity: c.capacity || null,
        genres: c.genres || [],
        verified: c.verified || false,
        notes: c.notes || null,
        outreach_status: 'pending'
    }));

    const { data, error } = await supabaseAdmin
        .from('booking_contacts')
        .insert(rows)
        .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update contact count on campaign
    const { count } = await supabaseAdmin
        .from('booking_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', id);

    await supabaseAdmin
        .from('booking_campaigns')
        .update({ contact_count: count || 0, updated_at: new Date().toISOString() })
        .eq('id', id);

    return NextResponse.json({ contacts: data, total: count });
}

// PATCH /api/bookings/[id]/contacts — update a contact's outreach status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auth = await requireUser(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { contactId, outreachStatus, notes } = body;

    if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 });

    const update: Record<string, any> = {};
    if (outreachStatus) {
        update.outreach_status = outreachStatus;
        if (outreachStatus === 'sent') update.last_contacted_at = new Date().toISOString();
    }
    if (notes !== undefined) update.notes = notes;

    const { data, error } = await supabaseAdmin
        .from('booking_contacts')
        .update(update)
        .eq('id', contactId)
        .eq('campaign_id', id)
        .eq('user_id', auth.user.id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Recount statuses on campaign
    const counts = await Promise.all([
        supabaseAdmin.from('booking_contacts').select('id', { count: 'exact', head: true }).eq('campaign_id', id),
        supabaseAdmin.from('booking_contacts').select('id', { count: 'exact', head: true }).eq('campaign_id', id).eq('outreach_status', 'sent'),
        supabaseAdmin.from('booking_contacts').select('id', { count: 'exact', head: true }).eq('campaign_id', id).eq('outreach_status', 'replied'),
        supabaseAdmin.from('booking_contacts').select('id', { count: 'exact', head: true }).eq('campaign_id', id).eq('outreach_status', 'booked'),
    ]);

    await supabaseAdmin
        .from('booking_campaigns')
        .update({
            contact_count: counts[0].count || 0,
            sent_count: counts[1].count || 0,
            replied_count: counts[2].count || 0,
            booked_count: counts[3].count || 0,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    return NextResponse.json({ contact: data });
}
