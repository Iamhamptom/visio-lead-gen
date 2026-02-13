# Visio Lead Gen - Project Overview for OpenAI Codex

## Project Location

```
/Volumes/HGARADIO-DRIVE1/Visio Sales Suite (V1)/visio-lead-gen
```

---

## Project Summary

**Project Name:** `visio-lead-gen` (Visio PR Assistant)  
**Framework:** Next.js 16.1.4 (TypeScript)  
**Purpose:** AI-powered lead generation and PR assistant platform for the entertainment industry. Uses neural search and AI to find relevant contacts, analyze outreach opportunities, and assist with PR tasks.

---

## Key Technologies

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js | 16.1.4 |
| Frontend | React | 19.2.3 |
| Language | TypeScript | ^5 |
| AI/ML | Google Generative AI | ^0.24.1 |
| AI/ML | OpenAI | ^6.16.0 |
| Neural Search | Exa.js | ^2.0.12 |
| Web Scraping | Puppeteer Core | ^24.35.0 |
| HTML Parsing | Cheerio | ^1.1.2 |
| Styling | Tailwind CSS | ^4 |
| Animation | Framer Motion | ^12.27.5 |
| UI Components | Radix UI, Lucide React, Hugeicons | - |
| Data | CSV Parse | ^6.1.0 |
| Charts | Recharts | ^3.7.0 |

---

## Project Structure

```
visio-lead-gen/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   └── [various endpoints for Exa search, Gemini AI, scraping]
│   ├── components/         # Reusable React components
│   ├── ad-spy/             # Ad intelligence/spy feature
│   ├── admin/              # Admin dashboard
│   ├── landing/            # Landing pages
│   ├── reach/              # Outreach features
│   ├── reason/             # AI reasoning features
│   ├── settings/           # User settings
│   ├── config/             # App configuration
│   ├── page.tsx            # Main application page (23KB)
│   ├── layout.tsx          # Root layout
│   ├── globals.css         # Global styles
│   └── types.ts            # TypeScript type definitions
│
├── lib/                    # Core library/utilities
│   ├── gemini.ts           # Gemini AI integration (12KB)
│   ├── search.ts           # Exa neural search logic
│   ├── scraper.ts          # Web scraping utilities
│   ├── db.ts               # Database operations
│   ├── brandStandards.ts   # Brand standards/guidelines
│   ├── utils.ts            # General utilities
│   └── sources/            # Data source configurations
│
├── knowledge/              # AI knowledge base and prompts
├── data/                   # Data files (CSV, JSON, etc.)
├── scripts/                # Helper/utility scripts
├── public/                 # Static assets
│
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── next.config.ts          # Next.js configuration
├── postcss.config.mjs      # PostCSS configuration
├── eslint.config.mjs       # ESLint configuration
└── .env.local              # Environment variables (API keys)
```

---

## Core Features

1. **Neural Search** - Uses Exa.js for AI-powered web search to find entertainment industry contacts and opportunities
2. **AI Assistant** - Gemini AI integration for consultative interactions and intelligent responses
3. **Web Scraping** - Puppeteer and Cheerio for extracting contact information from websites
4. **Ad Intelligence** - Ad spy feature for competitive analysis
5. **Outreach Management** - Tools for managing PR outreach campaigns
6. **Admin Dashboard** - Administrative controls and analytics

---

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

---

## Environment Variables Required

The project requires a `.env.local` file with the following API keys:

```env
# Google/Gemini AI
GOOGLE_API_KEY=your_google_api_key
# or
GEMINI_API_KEY=your_gemini_api_key

# Exa Neural Search
EXA_API_KEY=your_exa_api_key

# OpenAI (if used)
OPENAI_API_KEY=your_openai_api_key
```

---

## Key Files to Review

| File | Description |
|------|-------------|
| `app/page.tsx` | Main application page with core UI |
| `app/types.ts` | TypeScript type definitions |
| `lib/gemini.ts` | Gemini AI integration and prompts |
| `lib/search.ts` | Exa search implementation |
| `lib/scraper.ts` | Web scraping logic |
| `lib/db.ts` | Database operations |
| `app/api/` | All API route handlers |
| `scripts/approve-user.js` | **(NEW)** Admin script to manually approve users & fix permissions |

---

## Environment Variables Required

The project requires a `.env.local` file with the following API keys:

```env
# Google/Gemini AI
GOOGLE_API_KEY=your_google_api_key
# or
GEMINI_API_KEY=your_gemini_api_key

# Exa Neural Search
EXA_API_KEY=your_exa_api_key

# Supabase (Core & Admin)
NEXT_PUBLIC_SUPABASE_URL=https://nloihhezkwhwycztvfbd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# OpenAI (if used)
OPENAI_API_KEY=your_openai_api_key
```

---

## Common Maintenance Tasks

### 1. Approve a User Manually
If a user is stuck in the "Portal Gate" or not appearing in the dashboard:
1. Ensure `.env.local` has the `SUPABASE_SERVICE_ROLE_KEY`.
2. Run the approval script:
```bash
node scripts/approve-user.js
```
*(Edit the script to change the target email if needed)*

### 2. Verify Admin Access
To ensure an admin email (like `tonydavidhampton@gmail.com`) has correct permissions:
```bash
node scripts/verify-admin-access.js
```

---

## Notes for Code Review

- **Entertainment Industry Focus**: The AI prompts and search logic are tailored for music and entertainment industry use cases
- **Consultative AI**: The Gemini integration is designed to ask clarifying questions rather than immediately performing searches
- **Next.js App Router**: Uses the modern App Router pattern (not Pages Router)
- **TypeScript**: Fully typed with strict TypeScript configuration

---

*Generated: 2026-02-02*
