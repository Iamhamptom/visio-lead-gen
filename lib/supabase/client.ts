import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for use in browser/client components.
 * Uses the anon key for RLS-protected operations.
 */
export function createSupabaseClient() {
    const isBrowser = typeof window !== 'undefined';
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
                storage: isBrowser ? window.localStorage : undefined
            }
        }
    );
}

// Export a singleton for convenience
export const supabase = createSupabaseClient();
