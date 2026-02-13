import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function decodeJwtRole(jwt: string | undefined) {
    if (!jwt) return null;
    try {
        const parts = jwt.split('.');
        if (parts.length < 2) return null;
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
        const json = Buffer.from(padded, 'base64').toString('utf8');
        const data = JSON.parse(json) as any;
        return typeof data?.role === 'string' ? data.role : null;
    } catch {
        return null;
    }
}

function getKeyKind(key: string | undefined) {
    if (!key) return 'missing';
    if (key.startsWith('sb_publishable_')) return 'sb_publishable';
    if (key.startsWith('sb_secret_')) return 'sb_secret';
    if (key.split('.').length >= 2) return 'jwt';
    return 'unknown';
}

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
        ANON_KEY_KIND: getKeyKind(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        SERVICE_ROLE_KEY_KIND: getKeyKind(process.env.SUPABASE_SERVICE_ROLE_KEY),
        ANON_KEY_ROLE: decodeJwtRole(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'unknown',
        SERVICE_ROLE_KEY_ROLE: decodeJwtRole(process.env.SUPABASE_SERVICE_ROLE_KEY) || 'unknown',
    };
    return NextResponse.json(vars);
}
