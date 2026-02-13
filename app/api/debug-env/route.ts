import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    let projectRef = 'N/A';
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        if (url) {
            const host = new URL(url).hostname;
            projectRef = host.split('.')[0] || 'N/A';
        }
    } catch {
        projectRef = 'N/A';
    }

    const vars = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT' : 'MISSING',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'PRESENT' : 'MISSING',
        SUPABASE_PROJECT_REF: projectRef,
        // Print first 5 chars to verify if they match expected values (safe-ish)
        SERVICE_ROLE_START: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 5) + '...' : 'N/A'
    };
    return NextResponse.json(vars);
}
