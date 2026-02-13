import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/api-auth';
export async function POST(req: Request) {
    try {
        const admin = await requireAdmin(req);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.error }, { status: admin.status });
        }
        const { userId, approved } = await req.json();

        if (typeof userId !== 'string' || userId.length < 10) {
            return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
        }
        if (typeof approved !== 'boolean') {
            return NextResponse.json({ error: 'Invalid approved flag' }, { status: 400 });
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
