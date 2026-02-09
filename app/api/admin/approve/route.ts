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

        // 2. Verify Admin Role
        if (user.app_metadata.role !== 'admin') {
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
