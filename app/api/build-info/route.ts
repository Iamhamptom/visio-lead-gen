import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        commit: process.env.VERCEL_GIT_COMMIT_SHA || 'dev-environment',
        env: process.env.NODE_ENV,
        project_ref: process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0] : 'missing-url'
    });
}
