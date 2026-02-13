import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const expected = process.env.SETUP_ADMIN_SECRET;
    if (!expected) {
        // Hide the endpoint unless explicitly enabled.
        return NextResponse.json({ error: 'Not enabled' }, { status: 404 });
    }

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    if (authHeader !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            app_metadata: {
                role: 'admin',
                approved: true
            }
        });

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

export async function GET() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

