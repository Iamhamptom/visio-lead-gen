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
                if (cached?.user) {
                    setSession(cached);
                    setUser(cached.user ?? null);
                    setAuthStale(true);
                } else {
                    setSession(null);
                    setUser(null);
                }
            }
            setLoading(false);
        };

        getSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setAuthStale(false);
                storeSession(session ?? null);
                setLoading(false);
            }
        );

        const handleVisibility = async () => {
            if (document.visibilityState !== 'visible') return;
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setSession(session);
                setUser(session.user ?? null);
                setAuthStale(false);
                storeSession(session);
            } else if (authStale) {
                try {
                    const refreshed = await supabase.auth.refreshSession();
                    const nextSession = refreshed.data?.session ?? null;
                    if (nextSession) {
                        setSession(nextSession);
                        setUser(nextSession.user ?? null);
                        setAuthStale(false);
                        storeSession(nextSession);
                    }
                } catch {
                    // ignore refresh errors
                }
            }
        };

        window.addEventListener('focus', handleVisibility);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('focus', handleVisibility);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [authStale]);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setAuthStale(false);
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, authStale, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
