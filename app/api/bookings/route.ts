import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

const VIP_TIERS = new Set(['agency', 'enterprise']);

export const dynamic = 'force-dynamic';

// GET /api/bookings — list user's booking campaigns
export async function GET(req: NextRequest) {
    const auth = await requireUser(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Check VIP tier
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_tier')
        .eq('id', auth.user.id)
        .maybeSingle();

    if (!profile || !VIP_TIERS.has(profile.subscription_tier)) {
        return NextResponse.json({ error: 'Bookings is a VIP feature. Upgrade to Agency or Enterprise.' }, { status: 403 });
    }

    const { data: campaigns, error } = await supabaseAdmin
        .from('booking_campaigns')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('updated_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ campaigns: campaigns || [] });
}

// POST /api/bookings — create a new booking campaign
export async function POST(req: NextRequest) {
    const auth = await requireUser(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_tier')
        .eq('id', auth.user.id)
        .maybeSingle();

    if (!profile || !VIP_TIERS.has(profile.subscription_tier)) {
        return NextResponse.json({ error: 'Bookings is a VIP feature. Upgrade to Agency or Enterprise.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, targetRegions, targetTypes, genres, tourDates } = body;

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const { data: campaign, error } = await supabaseAdmin
        .from('booking_campaigns')
        .insert({
            user_id: auth.user.id,
            title,
            description: description || null,
            target_regions: targetRegions || [],
            target_types: targetTypes || ['venue', 'promoter', 'agency', 'events_company', 'club'],
            genres: genres || [],
            tour_dates: tourDates || null,
            status: 'draft'
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ campaign });
}
