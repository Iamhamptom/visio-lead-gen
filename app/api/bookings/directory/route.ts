import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/bookings/directory — browse the global venue/promoter database
// Available to all authenticated users (preview for free tier, full for VIP)
export async function GET(req: NextRequest) {
    const auth = await requireUser(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const url = new URL(req.url);
    const type = url.searchParams.get('type'); // venue, promoter, agency, etc.
    const region = url.searchParams.get('region'); // country or region filter
    const search = url.searchParams.get('q'); // search query
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

    // Check subscription tier for access level
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_tier')
        .eq('id', auth.user.id)
        .maybeSingle();

    const tier = profile?.subscription_tier || 'artist';
    const isVip = tier === 'agency' || tier === 'enterprise';

    // Build query from the global directory table
    let query = supabaseAdmin
        .from('booking_directory')
        .select('*', { count: 'exact' });

    if (type && type !== 'all') query = query.eq('type', type);
    if (region) query = query.or(`country.ilike.%${region}%,region.ilike.%${region}%,city.ilike.%${region}%`);
    if (search) query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,city.ilike.%${search}%`);

    query = query.order('country').order('city').range(offset, offset + limit - 1);

    const { data: contacts, count, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Non-VIP users: mask email and phone, show limited data
    const masked = (contacts || []).map(c => {
        if (isVip) return c;
        return {
            ...c,
            email: c.email ? c.email.replace(/(.{2}).*(@.*)/, '$1***$2') : null,
            phone: c.phone ? '***' + c.phone.slice(-4) : null,
            linkedin: null, // hide for free users
        };
    });

    return NextResponse.json({
        contacts: masked,
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
        isVip,
        regions: [], // populated below
    });
}
