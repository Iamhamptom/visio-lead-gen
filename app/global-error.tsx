'use client';

/**
 * Next.js global error page — catches errors in the root layout itself.
 * Must provide its own <html> and <body> since the root layout may have crashed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Can't use logError here since the whole app tree may be dead.
  // Log directly to console so Vercel captures it.
  if (typeof console !== 'undefined') {
    console.error('[visio-global-error]', error?.message, error?.stack);
  }

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0a0a0f', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: 80,
            height: 80,
            marginBottom: 32,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgb(248,113,113)" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, opacity: 0.9, marginBottom: 12 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '0.875rem', opacity: 0.5, marginBottom: 32, maxWidth: 400 }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={reset}
              style={{
                padding: '12px 24px',
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 24px',
                background: 'rgba(147,51,234,0.2)',
                color: 'rgb(216,180,254)',
                border: '1px solid rgba(147,51,234,0.2)',
                borderRadius: 12,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
