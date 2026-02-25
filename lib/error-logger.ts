/**
 * Centralised error logging & sanitisation.
 *
 * - Captures errors with context so the team can debug from Vercel / server logs.
 * - Sanitises messages before they reach the UI so users never see raw
 *   Supabase / JWT / SQL errors.
 * - Stores the last N errors in-memory (server) or sessionStorage (client)
 *   so they can be retrieved from `/api/health/errors` in the future.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorEntry {
  id: string;
  timestamp: string;
  message: string;
  code?: string;
  context?: string;        // e.g. "data-service:saveSessions"
  raw?: string;            // full serialised error (never shown to user)
  stack?: string;
  userAgent?: string;
  url?: string;
}

// ---------------------------------------------------------------------------
// In-memory ring-buffer (server & client)
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 200;
const entries: ErrorEntry[] = [];

function pushEntry(entry: ErrorEntry) {
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();
}

/** Read recent errors (for an admin/health endpoint). */
export function getRecentErrors(limit = 50): ErrorEntry[] {
  return entries.slice(-limit);
}

// ---------------------------------------------------------------------------
// Core logger
// ---------------------------------------------------------------------------

function serialise(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function logError(error: unknown, context?: string): ErrorEntry {
  const raw = serialise(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const entry: ErrorEntry = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    message: raw,
    context,
    raw,
    stack,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  // Extract Supabase error code if available
  if (error && typeof error === 'object' && 'code' in error) {
    entry.code = String((error as any).code);
  }

  pushEntry(entry);

  // Always emit to console so Vercel Functions logs capture it
  console.error(`[visio-error] [${context ?? 'unknown'}]`, raw, stack ?? '');

  // Persist to sessionStorage on the client (survives soft navigations)
  if (typeof window !== 'undefined') {
    try {
      const key = 'visio:errorLog';
      const prev: ErrorEntry[] = JSON.parse(sessionStorage.getItem(key) || '[]');
      prev.push(entry);
      if (prev.length > MAX_ENTRIES) prev.splice(0, prev.length - MAX_ENTRIES);
      sessionStorage.setItem(key, JSON.stringify(prev));
    } catch {
      // storage full or unavailable – ignore
    }
  }

  return entry;
}

// ---------------------------------------------------------------------------
// User-facing message sanitiser
// ---------------------------------------------------------------------------

const SENSITIVE_PATTERNS = [
  /supabase/i,
  /postgres/i,
  /pgvector/i,
  /row.level.security/i,
  /RLS/,
  /JWT/i,
  /token/i,
  /PGRST\d+/,
  /violates.*constraint/i,
  /relation.*does.*not.*exist/i,
  /column.*does.*not.*exist/i,
  /permission.*denied/i,
  /service_role/i,
  /anon.*key/i,
  /authorization/i,
  /duplicate.*key/i,
  /unique.*violation/i,
  /syntax.*error.*at/i,
  /could not serialize/i,
  /deadlock/i,
  /connection.*refused/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /fetch.*failed/i,
  /network.*error/i,
  /500.*internal/i,
  /502.*bad.*gateway/i,
  /503.*service.*unavail/i,
  /504.*gateway.*timeout/i,
];

/**
 * Return a safe, user-friendly message.
 * Technical details are logged internally but never shown to the user.
 */
export function sanitiseForUser(error: unknown, context?: string): string {
  // Log the full error internally first
  logError(error, context);

  const raw = serialise(error);

  // Check if the raw message contains anything we should hide
  const isSensitive = SENSITIVE_PATTERNS.some(p => p.test(raw));

  if (isSensitive) {
    // Map to user-friendly messages based on what went wrong
    if (/network|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch.*failed/i.test(raw)) {
      return 'Connection issue — please check your internet and try again.';
    }
    if (/JWT|token|auth|session/i.test(raw)) {
      return 'Your session has expired — please sign in again.';
    }
    if (/50[0234]/i.test(raw)) {
      return 'Our servers are temporarily busy — please try again in a moment.';
    }
    return 'Something went wrong. Our team has been notified and is looking into it.';
  }

  // If it looks like a clean user-facing message already, pass it through
  if (raw.length < 200 && !/\{|\[|Error:|stack|at\s/.test(raw)) {
    return raw;
  }

  return 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------------
// Global unhandled-error capture (client only)
// ---------------------------------------------------------------------------

let _globalHandlerInstalled = false;

export function installGlobalErrorHandler() {
  if (typeof window === 'undefined' || _globalHandlerInstalled) return;
  _globalHandlerInstalled = true;

  window.addEventListener('error', (event) => {
    logError(event.error ?? event.message, 'window.onerror');
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, 'unhandledrejection');
  });
}
