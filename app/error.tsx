'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Client error caught by boundary:', error);
    }, [error]);

    return (
        <div className="flex h-screen w-full bg-[#050505] items-center justify-center text-white font-outfit p-6">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                    <span className="text-3xl">⚠</span>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
                    <p className="text-white/50 text-sm leading-relaxed">
                        A temporary error occurred. This usually resolves by refreshing the page.
                    </p>
                </div>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={reset}
                        className="w-full py-3.5 rounded-xl bg-white text-black font-bold hover:bg-gray-100 transition-all"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => {
                            // Clear potentially corrupted auth state and reload
                            try {
                                window.localStorage.removeItem('visio:lastSession');
                                // Clear Supabase auth tokens
                                for (let i = window.localStorage.length - 1; i >= 0; i--) {
                                    const key = window.localStorage.key(i);
                                    if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
                                        window.localStorage.removeItem(key);
                                    }
                                }
                            } catch {}
                            window.location.href = '/';
                        }}
                        className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/70 font-medium hover:bg-white/10 transition-all"
                    >
                        Clear Session &amp; Reload
                    </button>
                </div>
                <p className="text-white/20 text-xs">
                    If this keeps happening, contact admin@visiocorp.co
                </p>
            </div>
        </div>
    );
}
