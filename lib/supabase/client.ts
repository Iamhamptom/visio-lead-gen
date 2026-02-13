import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for use in browser/client components.
 * Uses the anon key for RLS-protected operations.
 */
export function createSupabaseClient() {
    const isBrowser = typeof window !== 'undefined';

    const createSafeBrowserStorage = () => {
        // Supabase uses `storage` for auth tokens. If localStorage quota is exceeded,
        // token persistence can fail and users appear "randomly logged out" on refresh/background.
        // We aggressively prune Visio's own large caches on quota errors, and fall back to memory.
        const memory = new Map<string, string>();

        const getLocalStorage = (): Storage | null => {
            try {
                return window.localStorage;
            } catch {
                return null;
            }
        };

        const pruneVisioCaches = (ls: Storage) => {
            const keysToRemove: string[] = [];
            for (let i = 0; i < ls.length; i++) {
                const k = ls.key(i);
                if (!k) continue;
                if (k.startsWith('visio:sessions:')) keysToRemove.push(k);
            }
            for (const k of keysToRemove) {
                try {
                    ls.removeItem(k);
                } catch {
                    // ignore
                }
            }
        };

        return {
            getItem: (key: string) => {
                const ls = getLocalStorage();
                if (!ls) return memory.get(key) ?? null;
                try {
                    return ls.getItem(key);
                } catch {
                    return memory.get(key) ?? null;
                }
            },
            setItem: (key: string, value: string) => {
                const ls = getLocalStorage();
                if (!ls) {
                    memory.set(key, value);
                    return;
                }
                try {
                    ls.setItem(key, value);
                } catch {
                    // Attempt to free space by removing our own large keys, then retry once.
                    try {
                        pruneVisioCaches(ls);
                        ls.setItem(key, value);
                    } catch {
                        memory.set(key, value);
                    }
                }
            },
            removeItem: (key: string) => {
                const ls = getLocalStorage();
                if (!ls) {
                    memory.delete(key);
                    return;
                }
                try {
                    ls.removeItem(key);
                } catch {
                    memory.delete(key);
                }
            }
        };
    };

    // Safety check for build environments where secrets might be missing
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('⚠️ Supabase keys missing. Initializing stub client for build process.');
        // Return a proxy or stub to prevent crash during import/build
        return {
            __isStub: true,
            auth: {
                getUser: async () => ({ data: { user: null }, error: null }),
                getSession: async () => ({ data: { session: null }, error: null }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
                signInWithOAuth: async () => {
                    console.log('Mock signInWithOAuth called');
                    alert('Social Login is mocked! Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable real authentication.');
                    return { data: { url: 'http://localhost:3000/auth/callback' }, error: null };
                },
            },
            from: () => ({
                select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
                upsert: async () => ({ error: null }),
                insert: async () => ({ error: null }),
                url: new URL('http://localhost') // Mock URL property which might be accessed
            })
        } as any;
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storage: isBrowser ? createSafeBrowserStorage() : undefined
            }
        }
    );
}

// Export a singleton for convenience
export const supabase = createSupabaseClient();
