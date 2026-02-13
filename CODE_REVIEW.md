# Code Review: Visio Lead Gen

**Reviewer**: Claude AI
**Date**: 2026-02-13
**Scope**: Full codebase review

---

## Overview

Visio Lead Gen is an AI-powered PR assistant SaaS platform for the music/entertainment industry, built with Next.js 16 (App Router), TypeScript, Supabase, Google Gemini AI, and Yoco payments. The project combines AI chat, lead generation, web scraping, multi-pipeline data enrichment, subscription billing, and an admin dashboard.

---

## CRITICAL SECURITY ISSUES

### 1. `/api/debug-env` exposes infrastructure details in production
**File**: `app/api/debug-env/route.ts:28-51`

This endpoint is unauthenticated and returns the Supabase project reference, key types, and JWT roles to anyone who hits it. While it doesn't expose raw secrets, the metadata (project ref, key kinds, roles) is useful for attackers doing reconnaissance. This should be removed or gated behind admin auth.

### 2. `ADMIN_EMAILS` hardcoded in client-side code
**File**: `app/page.tsx:42`

```ts
const ADMIN_EMAILS = ['tonydavidhampton@gmail.com', 'hamptonmusicgroup@gmail.com'];
```

Admin email addresses are shipped to every browser. This is both a privacy leak and a targeting vector. Admin checks should happen exclusively server-side (as they already do in `lib/api-auth.ts`). The client-side `isAdmin` check should call a server endpoint instead of embedding emails in the JS bundle.

### 3. SSRF vulnerability in scraper
**File**: `lib/scraper.ts:109`

`scrapeContactsFromUrl` fetches any URL the user provides (via the `SCRAPE_URL:` trigger in the agent). There is no validation to prevent requests to internal IPs (`127.0.0.1`, `169.254.169.254` AWS metadata, `10.x.x.x`, etc.). An attacker could use this to probe internal infrastructure.

### 4. `IMPORT_PORTAL_DATA:` command parses arbitrary JSON from the client
**File**: `app/page.tsx:819-851`

The client-side `handleSendMessage` intercepts messages starting with `IMPORT_PORTAL_DATA:`, parses arbitrary JSON, and saves it directly to the database via `saveArtistProfile`. While this is client-side only, the pattern is fragile - it trusts user-controlled JSON without schema validation.

### 5. Webhook user lookup via `listUsers()` is not scalable and leaks timing info
**File**: `app/api/payments/webhook/route.ts:105-108`

```ts
const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
const found = users.find(u => (u.email || '').toLowerCase() === normalizedEmail);
```

This loads *all* auth users into memory on every webhook call where email lookup fails. At scale this will OOM. It also creates a timing side-channel (longer response when user exists).

### 6. Client-provided `tier` is trusted for AI model selection
**File**: `app/api/agent/route.ts:153` and `lib/gemini.ts:158-176`

The `tier` field from the POST body (`instant`, `business`, `enterprise`) is passed directly to `createGeminiClient` which selects the AI model. A malicious client can send `tier: "enterprise"` to access the most expensive model without paying. The server should read the user's actual subscription tier from the database.

---

## HIGH-PRIORITY BUGS

### 7. Duplicate session loading effects
**File**: `app/page.tsx:468-511` and `app/page.tsx:523-567`

There are **two separate `useEffect` hooks** that both load sessions from Supabase on mount. The first runs when `sessions.length === 0` and the second runs unconditionally for authenticated users. This creates a race condition where sessions may be loaded, merged, and set twice - leading to duplicated messages or lost state.

### 8. Schema mismatch: `starter` tier missing from DB CHECK constraint
**File**: `supabase/schema.sql:12`

```sql
CHECK (subscription_tier IN ('artist', 'artiste', 'starter_label', 'label', 'agency', 'enterprise'))
```

The `starter` tier (R199) is defined in `lib/yoco.ts` and used throughout the frontend (`app/page.tsx:788`), but the database `CHECK` constraint doesn't include it. Any user upgrading to `starter` would trigger a DB error on the webhook write.

### 9. `saveSessions` runs sequentially per session (N+1 queries)
**File**: `lib/data-service.ts:146-187`

Sessions are upserted one at a time in a `for` loop, each with their own message batch. For a user with 20 sessions, this is 40+ sequential DB calls on every debounced save (every 2 seconds). This will cause significant latency and potentially hit Supabase rate limits.

### 10. `loadSessions` has N+1 query pattern
**File**: `lib/data-service.ts:208-213`

Messages are loaded per-session in a loop. A user with 30 sessions means 31 database queries. This should use a single joined query or fetch all messages for the user at once.

### 11. `saveOnboardingComplete` misuses subscription_status
**File**: `lib/data-service.ts:248-254`

```ts
// Hack: using a field we can write to, ideally add 'onboarding_complete' column
.update({ subscription_status: 'active' })
```

This overwrites subscription status as a proxy for onboarding completion. If a user is `trialing` or `past_due`, calling this silently resets their status to `active`, effectively giving them a free subscription.

---

## ARCHITECTURE CONCERNS

### 12. 1,353-line monolithic page component
**File**: `app/page.tsx`

The root page handles auth state, session management, persistence, scrolling, message sending, view routing, subscription logic, and more - all in a single component. This makes it difficult to maintain and test. State should be extracted into custom hooks (e.g., `useSessionManager`, `usePersistence`, `useScrollControl`).

### 13. `no-store` cache headers on all routes
**File**: `next.config.ts:66-73`

```ts
{ key: 'Cache-Control', value: 'no-store, max-age=0' }
```

This applies to *every* route, including static assets, landing pages, and public pages. This kills performance for all visitors and prevents CDN caching entirely. Only dynamic/auth-dependent routes should have `no-store`.

### 14. File-system JSON database used in serverless
**File**: `lib/db.ts:53-63`

`getLeadsByCountry` reads JSON files via `fs.readFileSync` on every call. On Vercel's serverless functions, the filesystem is read-only and ephemeral - `saveLead()` at `lib/db.ts:149-171` writes to disk but those writes are lost after the function instance terminates. This should be migrated to Supabase.

### 15. Client-side SPA routing with rewrites pattern
**File**: `next.config.ts:6-61`

All routes (`/dashboard`, `/billing`, `/settings`, etc.) rewrite to `/` and the client `page.tsx` reads `window.location.pathname` to decide what to render. This means:
- No SSR for any page
- No per-page code splitting
- SEO is impossible for public pages
- The entire app JS bundle loads for every visitor

### 16. Gemini system prompt leaks internal architecture
**File**: `lib/gemini.ts:30-154`

The system prompt describes tool trigger formats (`LEAD_SEARCH:`, `SCRAPE_URL:`, `DEEP_SEARCH:`) that become exploitable if users craft inputs to hijack them. While the AI mediates this, prompt injection could trick Gemini into emitting `SCRAPE_URL:http://169.254.169.254/...` to hit the SSRF vector in issue #3.

---

## CODE QUALITY ISSUES

### 17. Excessive `any` typing
Multiple files use `any` liberally:
- `lib/data-service.ts:34` - `const payload: any = { ... }`
- `lib/data-service.ts:268` - `const updates: any = {}`
- `app/api/agent/route.ts:68-69` - `(l as any).instagram`
- `lib/scraper.ts:86` - `(links as any)[platform]`

This defeats TypeScript's purpose. Define proper interfaces for all data shapes.

### 18. Inconsistent error handling
Some functions return `false` on error (`saveArtistProfile`), some return `null` (`loadArtistProfile`), some return `{ ok: false, error }` (`saveSessions`), and some just swallow errors silently. Adopt a consistent `Result<T, E>` pattern.

### 19. Dead code and commented-out blocks
- `app/page.tsx:320-329` - Large commented-out redirect block
- `app/page.tsx:332-335` - Empty conditional body
- `lib/pipelines.ts:121` - Unused `googleQuery` variable (constructed with `site:apollo.io` but `fallbackResults` uses a different query)
- `app/page.tsx:401-403` - Orphaned empty lines and comments

### 20. Missing input validation on API routes
The agent route (`app/api/agent/route.ts:148`) destructures the request body without validating field types. `tier`, `mode`, `activeTool` are all trusted from the client without validation.

### 21. Regex-based social media URL patterns may miss edge cases
**File**: `lib/scraper.ts:67-76`

The YouTube regex `/(channel|c|@)[\/a-zA-Z0-9\-_]+/g` doesn't account for YouTube's `/@handle` format properly. The Twitter regex doesn't exclude common paths like `/home`, `/explore`, `/search`.

---

## PERFORMANCE ISSUES

### 22. `allLeads` memo scans all sessions and messages on every change
**File**: `app/page.tsx:998-1024`

This `useMemo` iterates every message in every session, runs regex matching, and JSON-parses embedded blocks. The dependency array includes `[sessions]`, so it re-runs whenever any session changes (including title updates, new messages in other sessions, etc.).

### 23. Session sync fires too frequently
**File**: `app/page.tsx:570-585`

The debounced remote save triggers on every change to `sessions` or `activeSessionId` with a 2-second delay. Since `sessions` is a new array reference after every update, this fires constantly during active chat. Combined with the N+1 query pattern in `saveSessions`, this creates significant unnecessary DB traffic.

### 24. `performLeadSearch` fires two Google searches per call
**File**: `lib/search.ts:92-96`

Every lead search makes two Serper API calls (primary + secondary with a "broader net"). This doubles API costs and latency. The secondary search query strips contact terms and adds "music blog site list" which may not be relevant to the user's query.

---

## RECOMMENDATIONS (Priority Order)

| # | Action | Severity |
|---|--------|----------|
| 1 | Fix the `starter` tier schema mismatch | Critical (billing bug) |
| 2 | Validate `tier` server-side from user's DB subscription | Critical (cost abuse) |
| 3 | Remove or auth-gate `/api/debug-env` | Critical (info disclosure) |
| 4 | Add SSRF protection to the scraper | Critical (infrastructure risk) |
| 5 | Remove hardcoded admin emails from client bundle | High (privacy leak) |
| 6 | Fix webhook `listUsers()` scalability issue | High |
| 7 | Deduplicate the session loading effects | High (data integrity) |
| 8 | Fix `saveOnboardingComplete` hack | High (billing integrity) |
| 9 | Batch `saveSessions`/`loadSessions` queries | Medium (performance) |
| 10 | Add URL-specific Cache-Control | Medium (performance) |
| 11 | Extract `page.tsx` into custom hooks | Medium (maintainability) |
| 12 | Migrate file-system DB to Supabase | Medium (data persistence) |
| 13 | Replace `any` types with proper interfaces | Low (type safety) |
| 14 | Clean up dead code and comments | Low (code hygiene) |

---

## POSITIVE NOTES

- **Solid auth architecture**: The `requireUser`/`requireAdmin` pattern in `lib/api-auth.ts` is well-structured with Bearer + cookie fallback
- **Webhook signature verification**: The Yoco webhook handler uses `timingSafeEqual` for HMAC verification - this is the correct approach
- **Graceful degradation**: Pipeline integrations fall back to Google Search when API keys aren't configured
- **RLS policies**: Supabase Row Level Security is properly configured for data isolation
- **Session resilience**: The auth context handles token recovery from localStorage cache when Supabase storage fails
- **Mobile-first design**: Good responsive patterns with sidebar overlay on mobile
