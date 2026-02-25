'use client';

import { useEffect } from 'react';
import { logError } from '@/lib/error-logger';

/**
 * Next.js App Router error page.
 * Catches unhandled errors in route segments and shows a recovery UI.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, 'app/error.tsx');
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 mb-8 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-white/90 mb-3">
        Something went wrong
      </h1>
      <p className="text-sm text-white/50 mb-8 max-w-md">
        An unexpected error occurred. Our team has been notified and is looking into it.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white/80 text-sm rounded-xl transition-colors border border-white/10"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 text-sm rounded-xl transition-colors border border-purple-500/20"
        >
          Go home
        </button>
      </div>
      {error.digest && (
        <p className="mt-6 text-[10px] text-white/15 font-mono">
          Error ref: {error.digest}
        </p>
      )}
    </div>
  );
}
