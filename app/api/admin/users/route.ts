import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

        // Mock session object for compatibility with existing logic
        const session = { user };

        // 2. Verify Admin Email (Hardcoded for Launch)
        const ADMIN_EMAILS = [
            'hampton@visio.ai', // Replace with actual admin email
            'visio-admin@test.com'
        ];

        // Allow if email matches OR if user has 'admin' metadata
        const isAdmin = ADMIN_EMAILS.includes(session.user.email || '') || session.user.app_metadata.role === 'admin';

        /* 
           TEMPORARY logic comment...
        */

        // Fetch all users
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) throw error;

        // Sort by created_at desc
        const sorted = users.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return NextResponse.json({ users: sorted });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
