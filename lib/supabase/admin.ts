import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// NOTE:
// This client uses the SERVICE_ROLE_KEY and must ONLY be used in server-side contexts (API routes).
// Do not import/use it from client components.

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (cached) return cached;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        // Don't throw at module import time (Next build can evaluate routes).
        // Throw only when an API route actually tries to use the admin client.
        throw new Error('Missing Supabase URL or Service Role Key');
    }

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
