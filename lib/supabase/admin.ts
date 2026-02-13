import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// NOTE:
// This client uses the SERVICE_ROLE_KEY and must ONLY be used in server-side contexts (API routes).
// Do not import/use it from client components.

let cached: SupabaseClient | null = null;

type SupabaseKeyKind = 'missing' | 'sb_publishable' | 'sb_secret' | 'jwt' | 'unknown';

function getSupabaseKeyKind(key: string | undefined): SupabaseKeyKind {
    if (!key) return 'missing';
    if (key.startsWith('sb_publishable_')) return 'sb_publishable';
    if (key.startsWith('sb_secret_')) return 'sb_secret';
    if (key.split('.').length >= 2) return 'jwt';
    return 'unknown';
}

function decodeJwtRole(jwt: string): string | null {
    try {
        const parts = jwt.split('.');
        if (parts.length < 2) return null;
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
        const json = Buffer.from(padded, 'base64').toString('utf8');
        const data = JSON.parse(json) as { role?: unknown };
        return typeof data?.role === 'string' ? data.role : null;
    } catch {
        return null;
    }
}

function assertServiceRoleKeyLooksValid(serviceRoleKey: string) {
    const kind = getSupabaseKeyKind(serviceRoleKey);

    // Supabase recently introduced non-JWT keys with `sb_publishable_` and `sb_secret_` prefixes.
    // The publishable key cannot call admin APIs; the secret key can.
    if (kind === 'sb_publishable') {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY is set to a publishable/anon key (starts with sb_publishable_). ' +
            'In Vercel, set SUPABASE_SERVICE_ROLE_KEY to the Supabase secret/service key (starts with sb_secret_) from Settings → API, then redeploy.'
        );
    }

    // For JWT-style keys, we can validate the embedded role claim.
    if (kind === 'jwt') {
        const role = decodeJwtRole(serviceRoleKey);
        if (role && role !== 'service_role') {
            throw new Error(
                `SUPABASE_SERVICE_ROLE_KEY is not a service_role JWT (detected role="${role}"). ` +
                'Use the service_role key from Supabase Settings → API, then redeploy.'
            );
        }
    }
}

export function getSupabaseAdmin(): SupabaseClient {
    if (cached) return cached;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        // Don't throw at module import time (Next build can evaluate routes).
        // Throw only when an API route actually tries to use the admin client.
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    assertServiceRoleKeyLooksValid(serviceRoleKey);

    cached = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    return cached;
}

// Backwards-compatible export used across route handlers.
// Lazily creates the admin client on first access to avoid crashing builds when env vars are absent.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        const client = getSupabaseAdmin() as any;
        const value = client[prop];
        return typeof value === 'function' ? value.bind(client) : value;
    }
});
