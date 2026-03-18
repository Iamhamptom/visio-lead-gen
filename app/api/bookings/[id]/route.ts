import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/bookings/[id] — get campaign with contacts
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auth = await requireUser(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: campaign, error } = await supabaseAdmin
        .from('booking_campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', auth.user.id)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const { data: contacts } = await supabaseAdmin
        .from('booking_contacts')
        .select('*')
        .eq('campaign_id', id)
        .eq('user_id', auth.user.id)
        .order('outreach_status', { ascending: true });

    return NextResponse.json({ campaign, contacts: contacts || [] });
}

// PATCH /api/bookings/[id] — update campaign
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auth = await requireUser(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const allowed = ['title', 'description', 'target_regions', 'target_types', 'genres', 'tour_dates', 'status', 'outreach_email_subject', 'outreach_email_body'];
    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
        if (body[key] !== undefined) update[key] = body[key];
    }

    const { data, error } = await supabaseAdmin
        .from('booking_campaigns')
        .update(update)
        .eq('id', id)
        .eq('user_id', auth.user.id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaign: data });
}

// DELETE /api/bookings/[id] — delete campaign + contacts
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auth = await requireUser(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { error } = await supabaseAdmin
        .from('booking_campaigns')
        .delete()
        .eq('id', id)
        .eq('user_id', auth.user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
