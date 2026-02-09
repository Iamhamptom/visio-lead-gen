import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const userId = searchParams.get('userId');

    if (secret !== 'visio_launch_2026') {
        return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            {
                app_metadata: {
                    role: 'admin',
                    approved: true
                }
            }
        );

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: `User ${userId} promoted to Admin`,
            user: data.user
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
