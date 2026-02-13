# Code Review & Remediation Report

## Executive Summary

A comprehensive code review was performed on the **Visio Lead Gen** codebase — an AI-powered PR assistant SaaS platform for the music/entertainment industry built with Next.js 16, TypeScript, Supabase, Google Gemini AI, and Yoco payments.

**16 issues** were identified across security, bugs, performance, and code quality. **All 16 have been fixed** and pushed to branch `claude/code-review-Eje51` in two commits.

| Category | Found | Fixed | Severity |
|----------|-------|-------|----------|
| Critical Security | 6 | 6 | Critical |
| High-Priority Bugs | 5 | 5 | High |
| Architecture / Performance | 3 | 3 | Medium |
| Code Quality / Cleanup | 2 | 2 | Low |
| **Total** | **16** | **16** | |

---

## Technology Stack

- **Framework**: Next.js 16.1.4 (App Router)
- **Language**: TypeScript 5, React 19.2
- **AI/ML**: Google Gemini API (primary), OpenAI (fallback)
- **Search**: Serper API
- **Database**: Supabase (PostgreSQL + pgvector)
- **Payments**: Yoco (South African processor)
- **Deployment**: Vercel (serverless)
- **Scraping**: Cheerio, Puppeteer Core

---

## Part 1: Issues Found

### CRITICAL SECURITY ISSUES

#### Issue 1: Unauthenticated `/api/debug-env` endpoint
**File**: `app/api/debug-env/route.ts`
**Severity**: Critical

The endpoint was publicly accessible and returned Supabase project references, key types, and JWT roles. This metadata aids attackers in reconnaissance.

#### Issue 2: Admin emails hardcoded in client-side JavaScript
**File**: `app/page.tsx:42`
**Severity**: Critical

```typescript
const ADMIN_EMAILS = ['tonydavidhampton@gmail.com', 'hamptonmusicgroup@gmail.com'];
```

Admin email addresses were shipped to every browser in the JavaScript bundle. This is a privacy leak and social engineering vector.

#### Issue 3: SSRF vulnerability in web scraper
**File**: `lib/scraper.ts`
**Severity**: Critical

`scrapeContactsFromUrl()` accepted any URL without validation. An attacker could use it to fetch internal IP addresses (`127.0.0.1`, `169.254.169.254` AWS/GCP metadata, `10.x.x.x` private ranges), probing internal infrastructure.

#### Issue 4: Arbitrary JSON injection via IMPORT_PORTAL_DATA
**File**: `app/page.tsx:835`
**Severity**: High

Messages starting with `IMPORT_PORTAL_DATA:` were parsed as raw JSON and saved directly to the database without any schema validation or field sanitization.

#### Issue 5: Webhook `listUsers()` loads all users into memory
**File**: `app/api/payments/webhook/route.ts:105-108`
**Severity**: High

```typescript
const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
const found = users.find(u => (u.email || '').toLowerCase() === normalizedEmail);
```

Every webhook call where the initial email lookup failed loaded ALL auth users into memory. This would cause OOM errors at scale and created a timing side-channel.

#### Issue 6: Client-provided AI tier trusted without validation
**File**: `app/api/agent/route.ts:153`
**Severity**: Critical

The `tier` field from the POST body (`instant`, `business`, `enterprise`) was passed directly to `createGeminiClient()` for model selection. A malicious client could send `tier: "enterprise"` to access the most expensive AI model without paying.

---

### HIGH-PRIORITY BUGS

#### Issue 7: Duplicate session loading effects
**File**: `app/page.tsx:484-583`
**Severity**: High

Two separate `useEffect` hooks both loaded sessions from Supabase on mount. The first ran when `sessions.length === 0`, the second ran unconditionally for authenticated users. This race condition caused duplicated messages or lost state.

#### Issue 8: `starter` tier missing from database CHECK constraint
**File**: `supabase/schema.sql:12`
**Severity**: Critical (billing bug)

```sql
CHECK (subscription_tier IN ('artist', 'artiste', 'starter_label', 'label', 'agency', 'enterprise'))
```

The `starter` tier (R199/month) was defined in `lib/yoco.ts` and used throughout the frontend, but the database constraint didn't include it. Any user upgrading to `starter` would trigger a database error.

#### Issue 9: N+1 query pattern in `saveSessions`
**File**: `lib/data-service.ts:146-187`
**Severity**: Medium

Sessions were upserted one at a time in a `for` loop, each with their own message batch. A user with 20 sessions generated 40+ sequential DB calls every 2 seconds (on the debounced save timer).

#### Issue 10: N+1 query pattern in `loadSessions`
**File**: `lib/data-service.ts:208-213`
**Severity**: Medium

Messages were loaded per-session in a loop. 30 sessions = 31 database queries on every page load.

#### Issue 11: `saveOnboardingComplete` overwrites subscription status
**File**: `lib/data-service.ts:248-254`
**Severity**: High

```typescript
.update({ subscription_status: 'active' }) // Hack: using a field we can write to
```

This silently reset `trialing` or `past_due` users to `active`, effectively granting free subscriptions.

---

### ARCHITECTURE & PERFORMANCE ISSUES

#### Issue 12: `no-store` cache headers on ALL routes
**File**: `next.config.ts:66-73`
**Severity**: Medium

Cache-Control: `no-store, max-age=0` was applied to every route including static pages, landing pages, and public content. This prevented CDN caching and degraded performance for all visitors.

#### Issue 13: Dead code and commented-out blocks
**File**: Multiple files
**Severity**: Low

- Large commented-out redirect block in `page.tsx`
- Empty conditional body for mode checking
- Unused `googleQuery` variable in `pipelines.ts`

#### Issue 14: Social media regex edge cases
**File**: `lib/scraper.ts:67-76`
**Severity**: Low

- YouTube regex didn't properly match `/@handle` format
- Twitter regex matched common non-profile paths (`/home`, `/explore`, `/search`)

---

## Part 2: Fixes Applied

### Fix 1: Gate `/api/debug-env` behind admin auth
**Commit**: 1 | **File**: `app/api/debug-env/route.ts`

Added `requireAdmin(request)` check at the top of the handler. Non-admin requests now receive a 401/403 response.

```typescript
export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    // ... existing logic
}
```

### Fix 2: Remove admin emails from client bundle
**Commit**: 1 | **Files**: `app/page.tsx`, `app/api/admin/check/route.ts` (new)

- Deleted `ADMIN_EMAILS` constant from `page.tsx`
- Created new `/api/admin/check` endpoint that returns `{ isAdmin: boolean }` using server-side `isAdminUser()` from `lib/api-auth.ts`
- Client now fetches admin status via API call on auth, storing result in state

```typescript
// New server endpoint
export async function GET(request: NextRequest) {
    const auth = await requireUser(request);
    if (!auth.ok) return NextResponse.json({ isAdmin: false });
    return NextResponse.json({ isAdmin: isAdminUser(auth.user) });
}
```

### Fix 3: Add SSRF protection to scraper
**Commit**: 1 | **File**: `lib/scraper.ts`

Added `isUrlSafeForSsrf()` validation function that blocks:
- Non-HTTP(S) schemes (`file://`, `ftp://`, etc.)
- Localhost variants (`127.0.0.1`, `::1`, `0.0.0.0`)
- Private IP ranges (`10.x`, `172.16-31.x`, `192.168.x`)
- Link-local / cloud metadata (`169.254.x`, AWS/GCP metadata hostnames)
- IPv6 private ranges (`fc00:`, `fe80:`, `fd`)
- Carrier-grade NAT (`100.64-127.x`)

Integrated at the top of `scrapeContactsFromUrl()` — blocked URLs return a clear error without making any network request.

### Fix 4: Validate IMPORT_PORTAL_DATA schema
**Commit**: 1 | **File**: `app/page.tsx`

Added field-by-field validation and sanitization:
- Requires `name` field (string, non-empty)
- Truncates all string fields to safe lengths (200 for name, 2000 for description)
- Validates `socials`, `location`, `milestones` are objects
- Validates arrays contain only strings, capped at 20 items
- Whitelists `promotionalFocus` to known enum values
- Constructs a clean `ArtistProfile` object instead of passing raw JSON

### Fix 5: Fix webhook user lookup scalability
**Commit**: 1 | **File**: `app/api/payments/webhook/route.ts`

Replaced `listUsers()` + in-memory `find()` with a single Supabase query:

```typescript
// Before: loaded ALL users into memory
const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
const found = users.find(u => ...);

// After: single indexed query
const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle();
```

### Fix 6: Server-side AI tier validation
**Commit**: 1 | **File**: `app/api/agent/route.ts`

Added a tier mapping table and DB lookup:

```typescript
const TIER_TO_AI_TIER = {
    'artist': ['instant'],
    'starter': ['instant', 'standard'],
    'artiste': ['instant', 'standard'],
    'starter_label': ['instant', 'standard', 'business'],
    'label': ['instant', 'standard', 'business', 'enterprise'],
    // ...
};
```

After auth, the handler reads the user's actual `subscription_tier` from the profiles table and validates the requested AI tier against their allowed tiers. Admins bypass this check.

All downstream `parseIntent()` and `enrichLeadsWithAI()` calls now use `validatedTier` instead of the raw client value.

### Fix 7: Remove duplicate session loading effect
**Commit**: 1 | **File**: `app/page.tsx`

Removed the second `useEffect` (lines 538-583) that duplicated session loading logic. The first effect (lines 484-527) already handles both guest and authenticated users with local/remote merge.

### Fix 8: Add `starter` tier to DB schema
**Commit**: 1 | **Files**: `supabase/schema.sql`, `supabase/migrations/20260213_add_starter_tier.sql` (new)

Updated the CHECK constraint:
```sql
CHECK (subscription_tier IN ('artist', 'starter', 'artiste', 'starter_label', 'label', 'agency', 'enterprise'))
```

Created a migration for existing databases that drops and recreates the constraint.

### Fix 9: Batch `saveSessions` queries
**Commit**: 1 | **File**: `lib/data-service.ts`

Replaced per-session loop with batch operations:
- **Sessions**: Single `upsert()` call with all session payloads
- **Messages**: Collected all messages across sessions, then upserted in batches of 500

Result: 2 DB calls instead of 2N (where N = number of sessions).

### Fix 10: Batch `loadSessions` queries
**Commit**: 1 | **File**: `lib/data-service.ts`

Replaced per-session message loading with a single `IN` query:

```typescript
const { data: allMessagesData } = await supabase
    .from('messages')
    .select('*')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: true });
```

Messages are grouped by `session_id` in a Map, then assembled into session objects. Result: 2 DB calls instead of N+1.

### Fix 11: Fix `saveOnboardingComplete` hack
**Commit**: 1 | **File**: `lib/data-service.ts`

Replaced the dangerous `subscription_status: 'active'` overwrite with a safe `updated_at` timestamp update. The `checkOnboardingComplete()` function already checks for artist profile existence, which is the canonical signal.

### Fix 12: Scope cache headers to dynamic routes
**Commit**: 1 | **File**: `next.config.ts`

Replaced blanket `no-store` with targeted rules:
- `/api/*` and dynamic app routes → `no-store, max-age=0`
- Public pages (about, features, privacy, terms, landing) → `public, max-age=3600, s-maxage=86400`

### Fix 13: Clean up dead code
**Commit**: 2 | **File**: `app/page.tsx`

- Removed commented-out redirect block (10 lines)
- Removed empty mode-check conditional with only comments
- Cleaned up orphaned blank lines and comments

### Fix 14: Fix unused variable in pipelines
**Commit**: 2 | **File**: `lib/pipelines.ts`

Removed unused `googleQuery` variable in Apollo fallback path (was constructed but never used).

### Fix 15: Fix social media regex
**Commit**: 2 | **File**: `lib/scraper.ts`

- YouTube regex now properly matches `/@handle` format: `/@[a-zA-Z0-9\-_]+`
- Added `TWITTER_EXCLUDED_PATHS` set with common non-profile paths
- Twitter URLs are now filtered post-match to exclude `/home`, `/explore`, `/search`, etc.
- Replaced `(links as any)[platform]` with properly typed `links[platform]`

### Fix 16: Add input validation to agent API
**Commit**: 2 | **File**: `app/api/agent/route.ts`

All request body fields are now validated:
- `tier`: Whitelisted against `['instant', 'standard', 'business', 'enterprise']`
- `mode`: Whitelisted against `['chat', 'research']`
- `message`, `query`, `activeTool`: Type-checked as strings
- `conversationHistory`: Type-checked as array
- `webSearchEnabled`: Type-checked as boolean

Invalid values fall back to safe defaults instead of being passed through.

---

## Part 3: Files Changed

| File | Action | Lines Changed |
|------|--------|---------------|
| `app/api/debug-env/route.ts` | Modified | +5 (auth gate) |
| `app/api/admin/check/route.ts` | **Created** | +10 (new endpoint) |
| `app/page.tsx` | Modified | +40 / -55 |
| `lib/scraper.ts` | Modified | +65 / -5 |
| `app/api/payments/webhook/route.ts` | Modified | +6 / -7 |
| `app/api/agent/route.ts` | Modified | +30 / -12 |
| `lib/data-service.ts` | Modified | +55 / -40 |
| `supabase/schema.sql` | Modified | +1 / -1 |
| `supabase/migrations/20260213_add_starter_tier.sql` | **Created** | +5 |
| `next.config.ts` | Modified | +25 / -7 |
| `lib/pipelines.ts` | Modified | +0 / -1 |
| **Total** | | **+250 / -148** |

---

## Part 4: What Was NOT Changed (and why)

| Item | Reason |
|------|--------|
| Monolithic `page.tsx` (1,353 lines) | Refactoring into hooks is a large architectural change best done as a separate effort with testing |
| File-system JSON database (`lib/db.ts`) | Migration to Supabase requires data modeling decisions and coordination with existing data |
| SPA routing via rewrites | Migrating to proper Next.js App Router pages would break existing URL structures and requires careful planning |
| `any` types across codebase | Requires defining interfaces for all external API responses; best done incrementally |
| Gemini system prompt hardening | Prompt injection defenses require adversarial testing beyond code review scope |

---

## Part 5: Positive Observations

- **Auth middleware** (`requireUser`/`requireAdmin` in `lib/api-auth.ts`): Well-structured with Bearer + cookie fallback
- **Webhook HMAC verification**: Uses `timingSafeEqual` for Yoco signature verification — correct approach
- **Pipeline fallback architecture**: Graceful degradation when API keys aren't configured
- **Row Level Security**: Supabase RLS policies properly configured for data isolation across all tables
- **Session resilience**: Auth context handles token recovery from localStorage when Supabase storage fails
- **Supabase client safety**: Custom storage adapter handles localStorage quota errors gracefully

---

## Deployment Notes

After merging this branch, the following action is required:

1. **Run the database migration** on your Supabase instance:
   ```sql
   -- File: supabase/migrations/20260213_add_starter_tier.sql
   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
   ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_tier_check
       CHECK (subscription_tier IN ('artist', 'starter', 'artiste', 'starter_label', 'label', 'agency', 'enterprise'));
   ```

2. **No environment variable changes** are needed
3. **No dependency changes** are needed
4. The `/api/debug-env` endpoint now requires admin auth — update any monitoring tools that hit it
