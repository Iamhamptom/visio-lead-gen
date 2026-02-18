'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    authStale: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    authStale: false,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [authStale, setAuthStale] = useState(false);

    useEffect(() => {
        const storageKey = 'visio:lastSession';

        const storeSession = (next: Session | null) => {
            try {
                if (!next) {
                    window.localStorage.removeItem(storageKey);
                    return;
                }
                window.localStorage.setItem(storageKey, JSON.stringify(next));
            } catch {
                // ignore storage failures
            }
        };

        const loadCachedSession = (): Session | null => {
            try {
                const raw = window.localStorage.getItem(storageKey);
                if (!raw) return null;
                return JSON.parse(raw) as Session;
            } catch {
                return null;
            }
        };

        // Get initial session
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setSession(session);
                setUser(session.user ?? null);
                setAuthStale(false);
                storeSession(session);
            } else {
                const cached = loadCachedSession();
                // If Supabase storage lost tokens (quota eviction, etc.), try to recover using the cached refresh token.
                if (cached?.refresh_token) {
                    try {
                        const refreshed = await supabase.auth.refreshSession(cached);
                        const nextSession = refreshed.data?.session ?? null;
                        if (nextSession) {
                            setSession(nextSession);
                            setUser(nextSession.user ?? null);
                            setAuthStale(false);
                            storeSession(nextSession);
                            setLoading(false);
                            return;
                        }
                    } catch {
                        // fall through to stale-cache mode below
                    }
                }

                // If we can't recover a real session, treat as signed out. A "stale" UI session causes
                // confusing 401s, admin lockouts, and failed Supabase sync, so we fail closed here.
                setSession(null);
                setUser(null);
                setAuthStale(false);
                storeSession(null);
            }
            setLoading(false);
        };

        getSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Skip INITIAL_SESSION — we handle initialization via getSession() above,
                // which includes backup recovery logic. Processing INITIAL_SESSION can
                // prematurely set user=null and clear the backup before recovery runs.
                if (event === 'INITIAL_SESSION') return;

                setSession(session);
                setUser(session?.user ?? null);
                setAuthStale(false);
                storeSession(session ?? null);
                setLoading(false);
            }
        );

        const handleVisibility = async () => {
            if (document.visibilityState !== 'visible') return;
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (currentSession) {
                    setSession(currentSession);
                    setUser(currentSession.user ?? null);
                    setAuthStale(false);
                    storeSession(currentSession);
                } else {
                    // Try to recover using cached refresh token
                    const cached = loadCachedSession();
                    const refreshed = cached?.refresh_token
                        ? await supabase.auth.refreshSession(cached)
                        : await supabase.auth.refreshSession();
                    const nextSession = refreshed.data?.session ?? null;
                    if (nextSession) {
                        setSession(nextSession);
                        setUser(nextSession.user ?? null);
                        setAuthStale(false);
                        storeSession(nextSession);
                    }
                    // If refresh failed: keep existing state. Don't sign out.
                    // Genuine session expiry will be caught by API 401 responses.
                }
            } catch {
                // Network error on tab refocus — keep existing state, don't sign out.
            }
        };

        // Periodic token refresh every 10 minutes to prevent session expiry
        const refreshInterval = setInterval(async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    // Automatically refresh the token
                    const { data } = await supabase.auth.refreshSession();
                    if (data?.session) {
                        setSession(data.session);
                        setUser(data.session.user ?? null);
                        storeSession(data.session);
                    }
                }
            } catch {
                // Silent fail - don't log user out on network errors
            }
        }, 10 * 60 * 1000); // 10 minutes

        window.addEventListener('focus', handleVisibility);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            subscription.unsubscribe();
            clearInterval(refreshInterval);
            window.removeEventListener('focus', handleVisibility);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setAuthStale(false);
        try { window.localStorage.removeItem('visio:lastSession'); } catch {}
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, authStale, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
