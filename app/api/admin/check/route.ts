import { NextRequest, NextResponse } from 'next/server';
import { requireUser, isAdminUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
    const auth = await requireUser(request);
    if (!auth.ok) {
        return NextResponse.json({ isAdmin: false });
    }

    return NextResponse.json({ isAdmin: isAdminUser(auth.user) });
}
