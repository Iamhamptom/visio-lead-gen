import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
    try {
        const { userId, approved } = await req.json();

        // 1. Verify Authentication
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 2. Verify Admin Email
        const ADMIN_EMAILS = ['tonydavidhampton@gmail.com', 'hamptonmusicgroup@gmail.com'];
        const userEmail = user.email ? user.email.toLowerCase().trim() : '';

        if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Update User Metadata
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { app_metadata: { approved: approved } }
        );

        if (error) throw error;

        return NextResponse.json({ user: data.user });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
