import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic'; // Prevent static generation attempts

// Simple security check - in production you'd want robust role-based auth
// For this launch, we'll check if the headers contain a secret or just rely on the fact 
// that this is an internal route.
// BETTER: Check if the *requesting user* is an admin via their session.

// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
// import { cookies } from 'next/headers';

export async function GET(req: Request) {
    try {
        // 1. Verify the requester is authenticated
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized - No Token' }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized - Invalid Token' }, { status: 401 });
        }

        // 2. Verify Admin Email
        const ADMIN_EMAILS = ['tonydavidhampton@gmail.com', 'hamptonmusicgroup@gmail.com'];
        if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
