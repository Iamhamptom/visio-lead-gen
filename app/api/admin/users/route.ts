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

        // Map profiles by ID for easy lookup
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Merge adn Sort by created_at desc
        const sorted = users.map(u => ({
            ...u,
            subscription: profileMap.get(u.id) || null
        })).sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return NextResponse.json({ users: sorted });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
