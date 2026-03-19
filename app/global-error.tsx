'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body style={{ background: '#050505', color: '#fff', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', margin: 0 }}>
                <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>
                        A temporary error occurred. Try refreshing.
                    </p>
                    <button
                        onClick={reset}
                        style={{ background: '#fff', color: '#000', border: 'none', padding: '12px 32px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                    >
                        Try Again
                    </button>
                    <br /><br />
                    <button
                        onClick={() => {
                            try {
                                window.localStorage.clear();
                            } catch {}
                            window.location.href = '/';
                        }}
                        style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 32px', borderRadius: 12, fontWeight: 500, fontSize: 14, cursor: 'pointer' }}
                    >
                        Clear Session &amp; Reload
                    </button>
                </div>
            </body>
        </html>
    );
}
