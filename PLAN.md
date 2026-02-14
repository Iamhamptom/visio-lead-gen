# Visio Lead Gen — Platform Overhaul Plan

## Overview

Transform Visio from an MVP with flat subscriptions into a **profitable, credit-based AI lead generation platform** with reliable data sources, rate limiting, and an upgraded AI agent. The goal: **70%+ gross margins** while delivering significantly more value to users.

---

## Phase 1: Credit System & Billing Overhaul

### 1.1 Database Schema — Add Credits

**New table: `credit_balances`**
```sql
CREATE TABLE credit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,        -- current credits
  lifetime_purchased INTEGER DEFAULT 0,       -- total ever purchased
  lifetime_used INTEGER DEFAULT 0,            -- total ever spent
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

**New table: `credit_transactions`** (audit trail)
```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,                    -- positive = credit, negative = debit
  balance_after INTEGER NOT NULL,             -- balance after transaction
  type TEXT CHECK (type IN ('purchase', 'subscription_grant', 'lead_search', 'deep_search', 'social_search', 'scrape', 'chat', 'content_gen', 'refund', 'bonus')),
  description TEXT,                           -- human-readable description
  metadata JSONB DEFAULT '{}',               -- tool used, query, results count, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS**: Users can only SELECT their own rows. INSERT/UPDATE only via service role (server-side).

### 1.2 Credit Pricing Model

**Cost basis** (what we pay per operation):

| Operation | Model / API Used | Our Cost | Credits Charged | User Pays | Margin |
|-----------|-----------------|----------|-----------------|-----------|--------|
| Chat message | Gemini 2.5 Flash-Lite | ~R0.01 | 1 credit | R0.15 | 93% |
| Smart chat (longer) | Gemini 2.5 Flash | ~R0.05 | 3 credits | R0.45 | 89% |
| Lead search (basic) | Apify email finder + Gemini | ~R0.50 | 10 credits | R1.50 | 67% |
| Deep search (all pipelines) | Apify multi-actor + Gemini | ~R2.00 | 30 credits | R4.50 | 56% |
| Social search | Apify social scrapers | ~R0.80 | 15 credits | R2.25 | 64% |
| URL scrape | Cheerio/Apify | ~R0.20 | 5 credits | R0.75 | 73% |
| Content generation (pitch/PR) | Gemini 2.5 Flash | ~R0.10 | 5 credits | R0.75 | 87% |
| Ad intelligence report | Meta API + Gemini | ~R0.30 | 10 credits | R1.50 | 80% |
| **Blended average** | | | | | **~75%** |

**1 credit = R0.15 (~$0.008 USD)**

### 1.3 Updated Subscription Tiers (hybrid: subscription + credits)

| Tier | Monthly Price (ZAR) | Credits Included | Extra Credit Price | AI Model Access |
|------|--------------------|-----------------|--------------------|-----------------|
| **Free** | R0 | 50/month | Can't buy more | Gemini Flash-Lite only |
| **Starter** | R199 | 500/month | R0.15 each | Flash-Lite + Flash |
| **Artiste** | R570 | 1,800/month | R0.12 each | Flash + Pro (limited) |
| **Starter Label** | R950 | 4,000/month | R0.10 each | All models |
| **Label** | R1,799 | 10,000/month | R0.08 each | All models + priority |
| **Agency** | R4,499 | 30,000/month | R0.06 each | All models + priority |
| **Enterprise** | Custom | Custom | Custom | Everything |

Monthly credits auto-grant on subscription renewal. Unused credits expire at end of billing cycle (no rollover — keeps users engaged).

### 1.4 Credit Top-Up Packs (one-time purchase via Yoco)

| Pack | Price (ZAR) | Credits | Per-Credit Cost | Discount |
|------|------------|---------|-----------------|----------|
| Starter Pack | R99 | 600 | R0.165 | 0% |
| Growth Pack | R399 | 3,000 | R0.133 | 19% |
| Pro Pack | R999 | 9,000 | R0.111 | 33% |
| Agency Pack | R2,499 | 25,000 | R0.100 | 39% |

Top-up credits **don't expire** (incentivizes bulk purchase).

### 1.5 Implementation Changes

**Files to modify:**
- `supabase/schema.sql` — Add `credit_balances` + `credit_transactions` tables + RLS
- `lib/yoco.ts` — Update `PLAN_PRICING` to include `creditsIncluded` per tier
- `app/data/pricing.ts` — Update feature matrix with credit amounts
- `app/api/payments/webhook/route.ts` — On successful payment, grant credits
- `app/api/cron/renew-subs/route.ts` — Monthly credit refresh on renewal

**New files:**
- `lib/credits.ts` — Core credit service:
  - `getBalance(userId): number`
  - `chargeCredits(userId, amount, type, metadata): { success, newBalance }`
  - `grantCredits(userId, amount, type, description): { success, newBalance }`
  - `hasEnoughCredits(userId, amount): boolean`
- `app/api/credits/balance/route.ts` — GET endpoint for client
- `app/api/credits/purchase/route.ts` — POST to buy top-up packs
- `supabase/migrations/20260213_add_credits.sql` — Migration file

---

## Phase 2: Replace PhantomBuster with Apify

### 2.1 Why Apify

| Factor | PhantomBuster | Apify |
|--------|--------------|-------|
| Pricing | $69-399/mo flat | Pay-per-use ($0.004/result) |
| API | Single agent output | 3,000+ actors, REST API |
| Maintenance | Manual phantom config | Managed actors, auto-retry |
| LinkedIn | Requires cookies/session | Multiple actors available |
| Social media | Limited platforms | Instagram, TikTok, Twitter, YouTube, LinkedIn |
| Google Maps | Not available | 270K+ users, $4/1K results |
| Email finding | Basic | Multiple specialized actors |
| Scalability | Agent-based (slow) | Serverless (parallel runs) |

### 2.2 Apify Actor Mapping

Replace current pipelines with these Apify actors:

| Current Pipeline | Apify Replacement Actor | Actor ID | Cost |
|------------------|------------------------|----------|------|
| PhantomBuster social scrape | **Social Media Leads Analyzer** | `apify/social-media-leads-analyzer` | ~$0.01/profile |
| PhantomBuster email/contact | **Contact Info Scraper** | `vdrmota/contact-info-scraper` | ~$0.005/site |
| Apollo (keep as primary) | Keep Apollo API | N/A | Existing |
| LinkedIn search | **LinkedIn Search Scraper** | `dev_fusion/linkedin-search-scraper` | ~$0.01/profile |
| Instagram fallback | **Instagram Scraper** | `apify/instagram-scraper` | ~$0.005/profile |
| TikTok fallback | **TikTok Scraper** | `clockworks/tiktok-scraper` | ~$0.001/profile |
| Google Maps (NEW) | **Google Maps Scraper** | `compass/crawler-google-places` | $0.004/place |
| Email enrichment (NEW) | **Email Scraper** | `dominic-quaiser/email-scraper` | ~$0.005/site |

### 2.3 Implementation Changes

**New file: `lib/apify.ts`** — Apify client service:
```typescript
// Core Apify integration
- createApifyClient() — Initialize with APIFY_API_TOKEN
- runActor(actorId, input, options) — Run actor and wait for results
- getDatasetItems(datasetId) — Fetch results from completed run

// Pipeline-specific functions
- apifySearchContacts(query, country) — Contact info scraper
- apifySocialLeads(urls) — Social media leads analyzer
- apifyLinkedInSearch(query, filters) — LinkedIn people search
- apifyInstagramSearch(query) — Instagram profile search
- apifyTikTokSearch(query) — TikTok profile search
- apifyGoogleMaps(query, location) — Business/venue search
- apifyEmailEnrich(urls) — Email extraction from websites
```

**Modified file: `lib/pipelines.ts`** — Replace PhantomBuster pipeline:
- Remove `searchPhantomBuster()` function entirely
- Replace with `searchApify()` that orchestrates multiple actors
- Keep Apollo as primary (it's good for verified B2B emails)
- Add Google Maps pipeline for venue/business searches
- Update `performDeepSearch()` to use new Apify pipelines
- Update `getPipelineStatus()` to check `APIFY_API_TOKEN`

**New env var:** `APIFY_API_TOKEN`

**Remove env vars:** `PHANTOMBUSTER_API_KEY`, `PHANTOMBUSTER_AGENT_ID`

**New dependency:** `apify-client` (npm package with auto-retry + smart polling)

### 2.4 Pipeline Architecture (New)

```
performDeepSearch(query, country)
├── Apollo API (B2B contacts, verified emails) — KEEP
├── Apify Contact Scraper (websites → emails/phones/socials)  — NEW
├── Apify Social Leads Analyzer (social profiles → enriched data) — NEW
├── Apify LinkedIn Search (professional profiles) — REPLACES LinkedIn API
├── Google Search + Cheerio scrape (fallback) — KEEP
└── Apify Google Maps (venues, businesses, labels) — NEW
    └── All run via Promise.allSettled() in parallel
    └── Deduplicate + merge by name/email
    └── Sort by confidence (high → low)
```

---

## Phase 3: Ad Intelligence (Meta Ads + Google Ads)

### 3.1 Meta Ads Library Integration

The Meta Ad Library API is **free** — no cost to us, pure margin for credits charged.

**New file: `lib/ad-intelligence.ts`**
```typescript
// Meta Ads Library API (FREE)
- searchMetaAds(query, country) — Search active ads by keyword/advertiser
- getAdvertiserAds(pageId) — Get all ads from a specific page
- analyzeAdCreatives(ads) — Use Gemini to analyze ad copy, hooks, CTAs
- calculateAdDurability(ads) — Long-running ads = likely profitable

// Google Ads Transparency (via SearchAPI or Apify)
- searchGoogleAds(advertiserName) — Find Google ads by advertiser
- getAdCreatives(advertiserId) — Get ad copy and formats
```

**New API route: `app/api/ad-intel/route.ts`**
- POST with `{ query, platform: 'meta' | 'google' | 'both', country }`
- Charges 10 credits per report
- Returns: ad creatives, estimated duration, AI analysis of what's working

**New env vars:**
- `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN` (for Ad Library API)
- `SEARCHAPI_KEY` (optional, for Google Ads transparency scraping)

### 3.2 Agent Tool Integration

Add new tools to `lib/tools.ts`:

| Tool | Trigger | Credits | Description |
|------|---------|---------|-------------|
| `ad_spy` | `AD_SPY: <query>` | 10 | Search competitor ads across Meta + Google |
| `ad_analyze` | `AD_ANALYZE: <url>` | 5 | Analyze specific ad creative with AI |
| `venue_search` | `VENUE_SEARCH: <query>` | 10 | Find venues/promoters via Google Maps |
| `company_search` | `COMPANY_SEARCH: <query>` | 10 | Find companies, labels, agencies |

---

## Phase 4: Rate Limiting & Gemini Cost Controls

### 4.1 Per-Tier Rate Limits

**New file: `lib/rate-limiter.ts`**

Use an in-memory rate limiter (no Redis needed at current scale) with Supabase as persistent backing store for daily/monthly limits.

| Tier | Chat RPM | Search RPM | Deep Search/hour | Daily Cap (credits) |
|------|----------|-----------|-------------------|---------------------|
| Free | 5 | 2 | 1 | 50 |
| Starter | 15 | 5 | 3 | 200 |
| Artiste | 30 | 10 | 5 | 500 |
| Starter Label | 60 | 20 | 10 | 1,000 |
| Label | 120 | 40 | 20 | 3,000 |
| Agency | 200 | 60 | 30 | 10,000 |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited |

**Implementation:**
```typescript
// Sliding window rate limiter (in-memory Map + cleanup interval)
- checkRateLimit(userId, tier, action): { allowed: boolean, retryAfter?: number }
- recordUsage(userId, action): void
- getRemainingQuota(userId, tier): { rpm, daily, monthly }
```

**Applied in:** `app/api/agent/route.ts` — Check rate limit BEFORE processing any request. Return `429 Too Many Requests` with `Retry-After` header.

### 4.2 Gemini Model Routing for Profitability

**Updated model mapping:**

| User Tier | Chat (simple) | Chat (complex) | Research/Search | Content Gen |
|-----------|---------------|----------------|-----------------|-------------|
| Free | Flash-Lite | Flash-Lite | Flash-Lite | N/A |
| Starter | Flash-Lite | Flash | Flash | Flash |
| Artiste | Flash | Flash | Flash | Flash |
| Starter Label | Flash | Flash | Pro | Flash |
| Label | Flash | Pro | Pro | Pro |
| Agency | Flash | Pro | Pro | Pro |
| Enterprise | Pro | Pro | Pro | Pro |

**Smart routing logic in `lib/gemini.ts`:**
```typescript
function selectModel(tier, messageLength, hasLeadSearch, mode) {
  // Short chat messages (<100 chars, no tool triggers) → Flash-Lite (cheapest)
  // Standard chat → Flash
  // Research mode or lead gen → tier-appropriate model
  // Content generation (pitch, PR, email) → Flash (good enough, cheap)
}
```

This routes ~70% of requests to Flash-Lite/Flash ($0.10-0.30/M tokens) and only ~30% to Pro ($1.25/M tokens), cutting our blended AI cost by ~60%.

### 4.3 Token Usage Tracking

**New table: `api_usage`**
```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost_zar NUMERIC(10,4),
  endpoint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Track every Gemini call for cost analysis and margin monitoring.

---

## Phase 5: Upgrade the AI Agent

### 5.1 Enhanced Capabilities

The agent currently detects intent via string prefix matching (`LEAD_SEARCH:`, `DEEP_SEARCH:`, etc.). We'll expand this with new tools and smarter routing.

**New tools to add to `lib/tools.ts`:**

| Tool | Name | What It Does | Credits |
|------|------|-------------|---------|
| `find_emails` | Email Finder | Given a person/company name, find their email using Apify + Apollo | 5 |
| `find_socials` | Social Finder | Given a person/company, find all social accounts | 5 |
| `company_lookup` | Company Intel | Find company info, employees, contacts, social presence | 10 |
| `venue_finder` | Venue Search | Find venues, clubs, promoters in a location via Google Maps | 10 |
| `ad_spy` | Ad Intelligence | Search competitor ads on Meta + Google | 10 |
| `batch_enrich` | Batch Enrichment | Take a list of names/URLs and enrich with emails + socials | 2/contact |
| `export_leads` | CSV Export | Export saved leads to CSV format | 5 |
| `web_research` | Deep Web Research | Multi-page web research with source citations | 10 |

### 5.2 Improved Tool Routing

**Current problem:** Tool triggers rely on the AI including exact string prefixes like `LEAD_SEARCH:` in its response. This is fragile.

**Solution:** After `parseIntent()`, use a structured tool-calling approach:

```typescript
// In app/api/agent/route.ts
// Instead of checking string prefixes, parse intent into structured actions:
interface AgentAction {
  tool: string;           // 'find_leads' | 'find_emails' | 'company_lookup' | etc.
  params: Record<string, any>;
  creditCost: number;
}

// 1. Parse user message → intent
// 2. Map intent to AgentAction(s) — can be multiple
// 3. Check credits (chargeCredits if enough, reject if not)
// 4. Execute tool(s)
// 5. Format response with results
```

### 5.3 Web Search Enhancement

**Current:** Uses Serper API for Google search results, returns 15 results max.

**Upgrade:**
- Add Apify web scraper for deeper page analysis
- Use Gemini to synthesize multi-page research into actionable summaries
- Add source citations to every claim
- Cache recent searches (same query within 1 hour = free, no credits)

### 5.4 Credit Awareness in Chat

The agent should be transparent about credit costs:

```
User: "Find me playlist curators in South Africa"

Visio: "I'll search for playlist curators in SA. This will use:
- 10 credits for lead search
- 5 credits for social enrichment
You have 485 credits remaining. Proceeding..."

[Results]

"Found 18 curators. 15 credits used. Balance: 470 credits."
```

---

## Phase 6: Implementation Order & File Changes

### Sprint 1: Credit System (Foundation)
1. `supabase/migrations/20260213_add_credits.sql` — **CREATE** new tables
2. `supabase/schema.sql` — **UPDATE** with credit tables
3. `lib/credits.ts` — **CREATE** credit service
4. `app/api/credits/balance/route.ts` — **CREATE** GET balance endpoint
5. `app/api/credits/purchase/route.ts` — **CREATE** top-up purchase endpoint
6. `lib/yoco.ts` — **UPDATE** add credit packs + creditsIncluded per tier
7. `app/data/pricing.ts` — **UPDATE** feature matrix with credits
8. `app/api/payments/webhook/route.ts` — **UPDATE** grant credits on payment
9. `app/api/cron/renew-subs/route.ts` — **UPDATE** monthly credit refresh

### Sprint 2: Rate Limiting
10. `lib/rate-limiter.ts` — **CREATE** sliding window rate limiter
11. `app/api/agent/route.ts` — **UPDATE** add rate limit check + credit deduction
12. `supabase/migrations/20260213_add_api_usage.sql` — **CREATE** usage table
13. `lib/gemini.ts` — **UPDATE** smart model routing + token tracking

### Sprint 3: Apify Integration (Replace PhantomBuster)
14. `lib/apify.ts` — **CREATE** Apify client + actor wrappers
15. `lib/pipelines.ts` — **UPDATE** replace PhantomBuster with Apify pipelines
16. `package.json` — **UPDATE** add `apify-client`, remove phantom references

### Sprint 4: Ad Intelligence
17. `lib/ad-intelligence.ts` — **CREATE** Meta Ads + Google Ads integration
18. `app/api/ad-intel/route.ts` — **CREATE** ad intelligence endpoint
19. `lib/tools.ts` — **UPDATE** add ad_spy, venue_search, company_search tools

### Sprint 5: Agent Upgrade
20. `lib/tools.ts` — **UPDATE** add find_emails, find_socials, company_lookup, batch_enrich
21. `app/api/agent/route.ts` — **UPDATE** structured tool routing + credit awareness
22. `lib/gemini.ts` — **UPDATE** system prompt with new capabilities + credit context
23. `app/page.tsx` — **UPDATE** show credit balance in UI, credit cost indicators

### Sprint 6: UI Updates
24. `app/page.tsx` — **UPDATE** credit balance display, usage meter, top-up CTA
25. `app/data/pricing.ts` — **UPDATE** pricing page with credits explanation

---

## New Environment Variables Required

```env
# Apify (replaces PhantomBuster)
APIFY_API_TOKEN=your_apify_token

# Meta Ads Library (free API)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_ACCESS_TOKEN=your_meta_access_token

# Google Ads Transparency (optional, via SearchAPI)
SEARCHAPI_KEY=your_searchapi_key

# Remove these:
# PHANTOMBUSTER_API_KEY (deleted)
# PHANTOMBUSTER_AGENT_ID (deleted)
```

---

## New Dependencies

```
+ apify-client     (Apify REST API client with auto-retry)
- puppeteer-core   (remove — Apify handles browser scraping)
```

---

## Estimated Credit Economics (Monthly)

**Scenario: 100 paying users, average Artiste tier (R570/mo)**

| | Revenue | Cost | Margin |
|---|---------|------|--------|
| Subscriptions | R57,000 | — | — |
| Credit top-ups (est. 30% buy) | R12,000 | — | — |
| **Total Revenue** | **R69,000** | | |
| Gemini API (smart routing) | — | R3,500 | — |
| Apify usage | — | R4,200 | — |
| Apollo API | — | R1,500 | — |
| Supabase | — | R500 | — |
| Vercel | — | R400 | — |
| Serper | — | R300 | — |
| **Total Cost** | | **R10,400** | |
| **Gross Profit** | | **R58,600** | **85%** |

At scale (1,000 users), costs grow sub-linearly due to caching and batching, pushing margins toward **88-90%**.

---

## Summary of Changes

| Category | Files Created | Files Modified | Files Removed |
|----------|--------------|---------------|---------------|
| Credits | 4 | 4 | 0 |
| Rate Limiting | 2 | 2 | 0 |
| Apify | 1 | 2 | 0 |
| Ad Intel | 2 | 1 | 0 |
| Agent Upgrade | 0 | 3 | 0 |
| UI | 0 | 2 | 0 |
| **Total** | **9** | **14** | **0** |

Env vars: +4 new, -2 removed
Dependencies: +1 new, -1 removed (puppeteer-core optional)
