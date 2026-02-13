import { createClient, type User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type AuthOk = { ok: true; user: User; accessToken?: string };
type AuthFail = { ok: false; status: number; error: string };

let cachedAuthClient: ReturnType<typeof createClient> | null = null;

function getAuthClient() {
    if (cachedAuthClient) return cachedAuthClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
        // Missing env in this deployment; treat as unauthorized rather than crashing.
        return null;
    }

    cachedAuthClient = createClient(url, anonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

    return cachedAuthClient;
}

function getBearerToken(request: Request): string | null {
    const raw = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!raw) return null;
    const match = raw.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
}

export async function requireUser(request: Request): Promise<AuthOk | AuthFail> {
    // 1) Prefer explicit Authorization header (works with client-side localStorage sessions)
    const accessToken = getBearerToken(request);
    if (accessToken) {
        const authClient = getAuthClient();
        if (!authClient) return { ok: false, status: 500, error: 'Auth not configured' };

        const { data, error } = await authClient.auth.getUser(accessToken);
        if (!error && data?.user) {
            return { ok: true, user: data.user, accessToken };
        }
    }

    // 2) Fallback to cookie-based session (OAuth / SSR flows)
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) return { ok: true, user };
    } catch {
        // ignore cookie auth errors
    }

    return { ok: false, status: 401, error: 'Unauthorized' };
}

export function isAdminUser(user: { email?: string | null; app_metadata?: Record<string, unknown> }) {
    const allowlist = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

    const email = (user.email || '').toLowerCase();
    const role = typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : '';

    if (allowlist.length > 0 && allowlist.includes(email)) return true;
    return role === 'admin';
}

export async function requireAdmin(request: Request): Promise<AuthOk | AuthFail> {
    const auth = await requireUser(request);
    if (!auth.ok) return auth;

    if (!isAdminUser(auth.user)) {
        return { ok: false, status: 403, error: 'Forbidden' };
    }

    return auth;
}
