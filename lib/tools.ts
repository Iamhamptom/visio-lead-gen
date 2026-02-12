/**
 * Visio AI Tool Registry
 * 
 * Central registry of all AI tools/skills available to the Visio PR Assistant.
 * Each tool has a name, description, parameter schema, and execute function.
 */

import { ContextPack } from './god-mode';

// ─── Tool Types ────────────────────────────────────────
export interface ToolDefinition {
    name: string;
    description: string;
    category: 'lead_gen' | 'content' | 'strategy' | 'research' | 'utility' | 'scraping';
    /** Instruction injected into the AI prompt when this tool is active */
    systemInstruction: string;
}

// ─── Tool Registry ─────────────────────────────────────
export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
    // ── Lead Generation ──
    find_leads: {
        name: 'Find Leads',
        description: 'Search for industry contacts — playlist curators, journalists, bloggers, DJs, radio hosts, PR agencies, A&R reps',
        category: 'lead_gen',
        systemInstruction: `You are now in LEAD FINDER mode.

TASK: Help the user find specific industry contacts based on their request.
APPROACH:
1. Identify what TYPE of contacts they need (bloggers, curators, DJs, journalists, PR agencies, A&R)
2. Identify the MARKET/COUNTRY they're targeting
3. Identify the GENRE or NICHE context
4. Generate a highly specific search query

RESPONSE FORMAT:
Start your response with: LEAD_SEARCH: <optimized search query>
Then on the next line, write a brief message to the user explaining what you're looking for.

Example:
User: "I need playlist curators for amapiano in South Africa"
Response:
LEAD_SEARCH: amapiano playlist curators South Africa Spotify Apple Music email contact submit
I'm searching for amapiano playlist curators across major streaming platforms in South Africa. Let me find the most active ones for you.

SEARCH QUERY TIPS:
- Always append "email contact" or "submit music" to find actionable contacts
- Include the genre and country for specificity
- For curators, include platform names (Spotify, Apple Music)
- For journalists, include "music journalist" or "music writer"
- For blogs, include "music blog" and the genre`
    },

    contact_enrich: {
        name: 'Enrich Contact',
        description: 'Get more details about a specific contact — social media, recent work, best way to reach them',
        category: 'lead_gen',
        systemInstruction: `You are now in CONTACT ENRICHMENT mode.
TASK: Research a specific person or company the user mentions.
Start your response with: SEARCH_REQUEST: <person name> <company> contact details social media
Then provide context about what you're looking up.`
    },

    deep_search: {
        name: 'Deep Search',
        description: 'Nuclear option — search across Apollo, LinkedIn, ZoomInfo, PhantomBuster, and Google simultaneously. Finds contacts with emails, social profiles, and company data.',
        category: 'lead_gen',
        systemInstruction: `You are now in DEEP SEARCH mode.

TASK: Find contacts using ALL available data pipelines simultaneously.
This searches Apollo.io, LinkedIn, ZoomInfo, PhantomBuster, AND Google — merging and deduplicating results.

RESPONSE FORMAT:
Start your response with: DEEP_SEARCH: <optimized search query>
Then explain what you're searching across all pipelines.

Example:
User: "I need A&R contacts at major labels in the US"
Response:
DEEP_SEARCH: A&R representatives major record labels United States music
I'm launching a deep search across all data pipelines — Apollo, LinkedIn, ZoomInfo, and Google — to find verified A&R contacts at major labels. This will take a moment but will return the most comprehensive results.

USE THIS WHEN:
- User needs verified email addresses
- User wants comprehensive contact data (social + email + company)
- User explicitly asks for a "deep" or "thorough" search
- High-value targets where coverage matters`
    },

    scrape_contacts: {
        name: 'Scrape Contacts',
        description: 'Extract emails, phone numbers, and social links from a specific website URL',
        category: 'scraping',
        systemInstruction: `You are now in WEB SCRAPER mode.

TASK: Extract contact information from a specific URL the user provides.
This scrapes the page for emails, social media links, phone numbers, and structured contact data.

RESPONSE FORMAT:
Start your response with: SCRAPE_URL: <url>
Then explain what you're going to extract.

Example:
User: "Can you get the contact info from this blog: https://example-music-blog.com/contact"
Response:
SCRAPE_URL: https://example-music-blog.com/contact
I'm scraping this page to extract email addresses, social media profiles, and any other contact information listed. One moment...

IMPORTANT RULES:
- ONLY scrape URLs the user provides or that appeared in previous search results
- Always explain what data you found
- If scraping fails, suggest alternative approaches`
    },

    social_search: {
        name: 'Social Media Search',
        description: 'Find profiles across Instagram, TikTok, Twitter/X, YouTube, LinkedIn, and SoundCloud',
        category: 'research',
        systemInstruction: `You are now in SOCIAL MEDIA SEARCH mode.

TASK: Find social media profiles across multiple platforms for industry contacts.
Searches Instagram, TikTok, Twitter/X, YouTube, LinkedIn, and SoundCloud using Google.

RESPONSE FORMAT:
Start your response with: SOCIAL_SEARCH: <query>
Then explain which platforms you're searching and why.

Example:
User: "Find hip hop bloggers on Instagram and TikTok"
Response:
SOCIAL_SEARCH: hip hop music blogger influencer
I'm searching Instagram and TikTok for hip hop bloggers and influencers. I'll look for active accounts that review or promote music.

USE THIS WHEN:
- User wants to find influencers or creators on social platforms
- User needs social handles for PR outreach
- User wants to verify someone's social presence`
    },

    linkedin_search: {
        name: 'LinkedIn Search',
        description: 'Find music industry professionals on LinkedIn — A&R, managers, publicists, label executives',
        category: 'lead_gen',
        systemInstruction: `You are now in LINKEDIN SEARCH mode.

TASK: Find music industry professionals on LinkedIn.
Uses the LinkedIn API if available, otherwise searches via Google site:linkedin.com.

RESPONSE FORMAT:
Start your response with: LINKEDIN_SEARCH: <query>
Then explain who you're looking for and why LinkedIn is the right source.

Example:
User: "Find PR managers at record labels in South Africa"
Response:
LINKEDIN_SEARCH: PR manager record label South Africa music
I'm searching LinkedIn for PR professionals at record labels in South Africa. LinkedIn is the best source for verified professional titles and company affiliations.`
    },

    apollo_search: {
        name: 'Apollo Search',
        description: 'Search Apollo.io for contacts with verified emails — best for B2B music industry outreach',
        category: 'lead_gen',
        systemInstruction: `You are now in APOLLO SEARCH mode.

TASK: Find contacts with verified email addresses using Apollo.io.
Uses the Apollo API if available, otherwise uses Google + scraping as fallback.

RESPONSE FORMAT:
Start your response with: APOLLO_SEARCH: <query>
Then explain the search parameters.

Example:
User: "I need email addresses for music journalists in the UK"
Response:
APOLLO_SEARCH: music journalist United Kingdom entertainment press
I'm searching for music journalists in the UK with verified email addresses. Apollo is our best source for B2B contact data.`
    },

    competitor_spy: {
        name: 'Competitor Analysis',
        description: 'Analyze a competitor artist\'s PR strategy, social presence, playlists, and media coverage',
        category: 'research',
        systemInstruction: `You are now in COMPETITOR SPY mode.

TASK: Research a competitor artist's PR presence and strategy.
Search for their press coverage, playlist placements, social media presence, and PR team.

RESPONSE FORMAT:
Start with: SEARCH_REQUEST: <artist name> press coverage playlist placement PR team
Then explain what intelligence you're gathering.

DELIVER:
1. **Media Coverage** — Recent press, interviews, features
2. **Playlist Placements** — Which playlists they're on
3. **Social Strategy** — Their social media approach and engagement
4. **PR Team** — Who represents them (publicist, manager, label)
5. **Opportunities** — Gaps you can exploit
6. **Tactical Recommendations** — What to learn and what to do differently`
    },

    playlist_scout: {
        name: 'Playlist Scout',
        description: 'Find and analyze playlist curators — Spotify, Apple Music, Deezer, and independent playlists',
        category: 'lead_gen',
        systemInstruction: `You are now in PLAYLIST SCOUT mode.

TASK: Find playlist curators and submission opportunities.
Search across Spotify, Apple Music, and independent playlist platforms.

RESPONSE FORMAT:
Start with: LEAD_SEARCH: <genre> playlist curator submit <platform> contact email
Then explain your search strategy.

SEARCH STRATEGY:
- Search for "<genre> playlist submit" or "<genre> playlist curator contact"
- Include platform names (Spotify, Apple Music, Deezer)
- Look for SubmitHub, PlaylistPush, and independent submission sites
- Search for playlist curator social profiles
- Include "submit music" "send demos" "accepting submissions" in queries`
    },

    venue_finder: {
        name: 'Venue Finder',
        description: 'Find venues, promoters, and booking contacts for live performances',
        category: 'lead_gen',
        systemInstruction: `You are now in VENUE FINDER mode.

TASK: Find performance venues, promoters, and booking contacts.
Search for venues that match the artist's genre and location.

RESPONSE FORMAT:
Start with: LEAD_SEARCH: <genre> venue promoter booking contact <city/country>
Then explain what types of venues you're searching for.

SEARCH STRATEGY:
- Search for "<genre> live music venue <city>" 
- Include "booking" "promoter" "contact" "submit"
- Look for club nights, festivals, and event spaces
- Search for promoter social profiles and booking emails
- Consider the artist's level (small clubs vs arenas)`
    },

    // ── Content Creation ──
    draft_pitch: {
        name: 'Draft Pitch',
        description: 'Write a professional PR pitch email — personalized, warm, and strategic',
        category: 'content',
        systemInstruction: `Write a concise, professional PR pitch email.

FORMAT:
**Subject Line:** [Compelling subject]

[Greeting — use the recipient's name if known]

[Paragraph 1: Hook — what's the story/release and why it matters NOW]

[Paragraph 2: The ask — what you want from them, made easy to say yes to]

[Sign-off with artist/team name]

RULES:
- Keep it under 150 words
- Be warm but professional — no begging or overselling
- Reference the recipient's past work if context is available
- Include a clear call-to-action
- Mention streaming links, EPK, or press assets if available from the artist profile`
    },

    press_release: {
        name: 'Press Release',
        description: 'Draft a press release for a release, event, or announcement',
        category: 'content',
        systemInstruction: `Draft a professional press release.

FORMAT:
**FOR IMMEDIATE RELEASE**

**[HEADLINE — punchy, newsworthy]**

*[Subheadline — one line context]*

[City, Date] — [Opening paragraph: Who, What, When, Where, Why in 2-3 sentences]

[Body paragraph: More detail, quotes if appropriate, context about the artist]

[Closing paragraph: Where to find more info, streaming links, upcoming dates]

**###**

**Press Contact:** [Use artist profile info if available]

RULES:
- Professional AP-style writing
- Third person
- Under 300 words
- Include relevant links and assets from artist profile`
    },

    social_pack: {
        name: 'Social Media Pack',
        description: 'Create a pack of social media posts — captions, hashtags, and content ideas',
        category: 'content',
        systemInstruction: `Create a social media content pack.

DELIVER:
1. **5 Post Ideas** with captions (1-2 sentences each)
2. A **hashtag set** (10-15 relevant hashtags)
3. **Best posting times** recommendation
4. **Platform-specific tips** (Instagram vs TikTok vs Twitter/X)

RULES:
- Match the artist's brand voice from their profile
- Include a mix of content types (announcement, behind-the-scenes, engagement, storytelling)
- Captions should feel authentic, not corporate
- Include emoji but don't overdo it`
    },

    email_sequence: {
        name: 'Email Sequence',
        description: 'Create a multi-email outreach sequence for PR campaigns',
        category: 'content',
        systemInstruction: `Create a 3-email PR outreach sequence.

FORMAT:
**Email 1 — Initial Outreach** (send 3-4 weeks before release)
Subject: [subject line]
[Body — 100 words max, introduce and hook]

**Email 2 — Follow-Up** (send 1 week after Email 1 if no response)
Subject: [subject line]
[Body — 80 words max, add value, don't just "check in"]

**Email 3 — Release Day** (send on release day)
Subject: [subject line]
[Body — 60 words max, share the link, make it easy]

RULES:
- Each email should stand alone
- Never say "just following up" or "circling back"
- Add new value in each email (new asset, review quote, streaming milestone)`
    },

    // ── Strategy ──
    campaign_plan: {
        name: 'Campaign Plan',
        description: 'Build a full PR campaign timeline with milestones, deliverables, and strategy',
        category: 'strategy',
        systemInstruction: `Create a comprehensive PR campaign plan.

FORMAT:
**Campaign: [Name]**
**Timeline:** [Start] to [End]
**Budget:** [Range from artist profile or estimate]

**Phase 1: Pre-Release (Weeks 1-2)**
- [Action items with deadlines]

**Phase 2: Launch Week**
- [Action items with deadlines]

**Phase 3: Post-Launch (Weeks 1-4)**
- [Action items with deadlines]

**Key Deliverables:**
- [List of content/assets needed]

**KPIs to Track:**
- [Measurable outcomes]

RULES:
- Be specific with dates relative to release
- Include both paid and organic strategies
- Account for the artist's budget and goals
- Prioritize actions by impact`
    },

    market_analysis: {
        name: 'Market Analysis',
        description: 'Analyze market trends, competitor landscape, and opportunities for the artist',
        category: 'strategy',
        systemInstruction: `Provide a market analysis based on the artist's genre and location.

COVER:
1. **Current Trends** — What's working in the genre right now
2. **Opportunities** — Gaps or underserved areas the artist can exploit
3. **Competitor Snapshot** — Who's doing well and what they're doing
4. **Recommended Approach** — Strategic advice based on the analysis

RULES:
- Be specific to the genre and market
- Use your knowledge of music industry trends
- Provide actionable insights, not just observations
- Reference real platforms, playlists, and media where relevant
- If you need current data, prefix with SEARCH_REQUEST:`
    },

    budget_plan: {
        name: 'Budget Plan',
        description: 'Create a budget breakdown for a PR campaign with cost estimates',
        category: 'strategy',
        systemInstruction: `Create a PR campaign budget breakdown.

FORMAT:
**Budget Plan: [Campaign Name]**
**Total Budget:** [Amount in ZAR]

| Category | Item | Estimated Cost | Priority |
|----------|------|---------------|----------|
| [Category] | [Item] | R[Amount] | High/Medium/Low |

**Notes:**
- [Budget optimization tips]
- [Where to save vs where to invest]

RULES:
- Use South African Rand (ZAR) unless user specifies otherwise
- Be realistic with pricing
- Prioritize spend by ROI
- Include free/organic alternatives where possible
- Flag nice-to-haves vs essentials`
    },

    // ── Research ──
    web_search: {
        name: 'Web Search',
        description: 'Search the web for any topic — artist research, trends, news, opportunities',
        category: 'research',
        systemInstruction: `Use SEARCH_REQUEST if the user needs fresh facts, current information, or research about a specific topic.
Keep the search query short, specific, and targeted.
After receiving results, synthesize them into a clear, actionable summary.`
    },

    // ── Utility ──
    summarize_chat: {
        name: 'Summarize Chat',
        description: 'Get a summary of the conversation with key decisions and next steps',
        category: 'utility',
        systemInstruction: `Summarize this conversation in a structured format:

**Key Decisions Made:**
- [List decisions]

**Action Items:**
- [List next steps with owners]

**Open Questions:**
- [List unresolved items]

Keep it concise — max 200 words. Focus on what matters.`
    }
};

// ─── Helper Functions ──────────────────────────────────

/** Get all tool definitions formatted for the system prompt */
export function getToolDescriptions(): string {
    return Object.entries(TOOL_REGISTRY)
        .map(([key, tool]) => `- **${tool.name}** (${key}): ${tool.description}`)
        .join('\n');
}

/** Get the instruction for a specific active tool */
export function getToolInstruction(toolName: string): string | null {
    const tool = TOOL_REGISTRY[toolName];
    return tool?.systemInstruction || null;
}

/** Get tools by category */
export function getToolsByCategory(category: ToolDefinition['category']): ToolDefinition[] {
    return Object.values(TOOL_REGISTRY).filter(t => t.category === category);
}
