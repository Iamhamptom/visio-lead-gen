/**
 * Growing Knowledge Base System
 *
 * Manages skill MDs, saves learned patterns, and accumulates
 * knowledge from successful interactions.
 * Feeds into the AI system prompt for smarter responses.
 */

import { createSupabaseAdminClient } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────
export type SkillCategory = 'general' | 'genre_specific' | 'platform' | 'outreach' | 'campaign' | 'market';
export type SkillStatus = 'active' | 'draft' | 'deprecated' | 'archived';

export interface KnowledgeSkill {
    id: string;
    slug: string;
    title: string;
    category: SkillCategory;
    content: string;
    version: number;
    source: string;
    successCount: number;
    usageCount: number;
    effectivenessScore: number;
    status: SkillStatus;
    tags: string[];
}

export interface CreateSkillParams {
    slug: string;
    title: string;
    category: SkillCategory;
    content: string;
    source?: string;
    tags?: string[];
}

// ─── Skill Management ────────────────────────────────

/** Create or update a knowledge skill */
export async function upsertSkill(params: CreateSkillParams): Promise<string | null> {
    const supabase = createSupabaseAdminClient();

    // Check if skill with this slug already exists
    const { data: existing } = await supabase
        .from('knowledge_skills')
        .select('id, version')
        .eq('slug', params.slug)
        .maybeSingle();

    if (existing) {
        // Update existing skill, increment version
        const { error } = await supabase
            .from('knowledge_skills')
            .update({
                title: params.title,
                category: params.category,
                content: params.content,
                version: existing.version + 1,
                tags: params.tags || [],
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

        if (error) {
            console.error('[KnowledgeBase] Update failed:', error);
            return null;
        }
        return existing.id;
    }

    // Create new skill
    const { data, error } = await supabase
        .from('knowledge_skills')
        .insert({
            slug: params.slug,
            title: params.title,
            category: params.category,
            content: params.content,
            source: params.source || 'manual',
            tags: params.tags || [],
        })
        .select('id')
        .single();

    if (error) {
        console.error('[KnowledgeBase] Create failed:', error);
        return null;
    }
    return data?.id || null;
}

/** Get all active skills */
export async function getActiveSkills(category?: SkillCategory): Promise<KnowledgeSkill[]> {
    const supabase = createSupabaseAdminClient();

    let query = supabase
        .from('knowledge_skills')
        .select('*')
        .eq('status', 'active')
        .order('effectiveness_score', { ascending: false });

    if (category) {
        query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
        console.error('[KnowledgeBase] Query failed:', error);
        return [];
    }

    return (data || []).map(mapSkillFromDb);
}

/** Get relevant skills for a given query context */
export async function getRelevantSkills(
    genre?: string,
    country?: string,
    intent?: string,
    limit: number = 5
): Promise<KnowledgeSkill[]> {
    const supabase = createSupabaseAdminClient();

    // Build tag-based matching
    const searchTags: string[] = [];
    if (genre) searchTags.push(genre.toLowerCase());
    if (country) searchTags.push(country.toLowerCase());
    if (intent) searchTags.push(intent.toLowerCase());

    // Get all active skills and rank by tag overlap + effectiveness
    const { data, error } = await supabase
        .from('knowledge_skills')
        .select('*')
        .eq('status', 'active')
        .order('effectiveness_score', { ascending: false })
        .limit(50);

    if (error || !data) return [];

    // Score skills by tag relevance
    const scored = data.map(skill => {
        const skillTags = (skill.tags || []).map((t: string) => t.toLowerCase());
        const tagOverlap = searchTags.filter(t => skillTags.includes(t)).length;
        const relevanceScore = tagOverlap * 10 + (skill.effectiveness_score || 0);
        return { ...skill, relevanceScore };
    });

    // Sort by relevance, take top N
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scored.slice(0, limit).map(mapSkillFromDb);
}

/** Record that a skill was used in a response */
export async function recordSkillUsage(skillId: string, wasSuccessful: boolean): Promise<void> {
    const supabase = createSupabaseAdminClient();

    // Get current stats
    const { data: skill } = await supabase
        .from('knowledge_skills')
        .select('usage_count, success_count')
        .eq('id', skillId)
        .single();

    if (!skill) return;

    const newUsageCount = (skill.usage_count || 0) + 1;
    const newSuccessCount = (skill.success_count || 0) + (wasSuccessful ? 1 : 0);
    const newEffectiveness = newUsageCount > 0 ? newSuccessCount / newUsageCount : 0;

    await supabase
        .from('knowledge_skills')
        .update({
            usage_count: newUsageCount,
            success_count: newSuccessCount,
            effectiveness_score: Math.round(newEffectiveness * 100) / 100,
            updated_at: new Date().toISOString(),
        })
        .eq('id', skillId);
}

/** Format skills for injection into AI system prompt */
export function formatSkillsForPrompt(skills: KnowledgeSkill[]): string {
    if (skills.length === 0) return '';

    const lines = skills.map(s => {
        const score = s.effectivenessScore > 0 ? ` (${Math.round(s.effectivenessScore * 100)}% effective)` : '';
        return `### ${s.title}${score}\n${s.content}`;
    });

    return `## LEARNED SKILLS & KNOWLEDGE\nThese are proven strategies from past successful interactions:\n\n${lines.join('\n\n')}`;
}

// ─── Seed initial skills from existing knowledge ─────

/** Seed the knowledge base with the initial skill set */
export async function seedInitialSkills(): Promise<number> {
    const initialSkills: CreateSkillParams[] = [
        {
            slug: 'song-release-campaign',
            title: 'Song/EP Release Campaign Strategy',
            category: 'campaign',
            content: `When an artist is releasing music:
1. **Gather**: Genre, release date, available assets (EPK, press release, music video)
2. **Timeline**: Submit to DSPs 4+ weeks early. Pitch editorial playlists 3-4 weeks before. PR outreach 3 weeks. Social teasers 2 weeks.
3. **Contacts to find**: Playlist curators (Spotify + Apple Music), music bloggers (genre-specific), radio compilers, TikTok influencers
4. **Pitch timing**: Tuesday-Thursday, 9-11 AM recipient timezone. Never Fridays/Mondays.
5. **Follow-up**: First follow-up 5-7 days later. Max 2 follow-ups. Add new value each time.`,
            source: 'manual',
            tags: ['campaign', 'release', 'music', 'strategy'],
        },
        {
            slug: 'event-promotion-strategy',
            title: 'Event Promotion Strategy',
            category: 'campaign',
            content: `When promoting an event:
1. **Gather**: City/location, date, vibe/theme, budget (paid vs barter)
2. **Contacts**: Local lifestyle influencers, event listing pages, culture pages, nano to mega based on budget
3. **Approach**: For budget promotions, offer guest list + VIP as barter. For paid, negotiate story + post packages.
4. **Timing**: Start outreach 3 weeks before. Ramp up social mentions 2 weeks before. Day-of content is critical for FOMO.`,
            source: 'manual',
            tags: ['campaign', 'event', 'promotion', 'influencer'],
        },
        {
            slug: 'amapiano-market-sa',
            title: 'Amapiano Market - South Africa',
            category: 'genre_specific',
            content: `Amapiano PR in South Africa:
- **Key platforms**: Spotify, Apple Music, TikTok (dance challenges are critical)
- **Top blogs**: Fakaza, SA Hip Hop Mag, Slikour, Okay Africa
- **Radio**: Metro FM, Ukhozi FM, 5FM
- **Strategy**: TikTok dance challenges drive virality. Partner with choreographers. Spotify editorial playlist submission 4 weeks early.
- **Pricing**: Nano influencers (5K-50K): R500-R2000. Micro (50K-200K): R2000-R8000. Macro (200K+): R8000+`,
            source: 'manual',
            tags: ['amapiano', 'south africa', 'za', 'genre'],
        },
        {
            slug: 'pitch-email-best-practices',
            title: 'Pitch Email Best Practices',
            category: 'outreach',
            content: `Writing pitch emails that get opened (40%+ open rate):
1. **Subject line**: Keep under 50 chars. Include genre + hook. e.g. "New Amapiano x UK Drill crossover - exclusive"
2. **Opening**: Reference their recent work. Show you know them. 1 sentence max.
3. **The pitch**: What you want (placement/review/feature), why it fits their audience. 2-3 sentences.
4. **Assets**: Link to private SoundCloud/Dropbox. Never attach MP3s. Include press photos link.
5. **CTA**: Clear ask. "Would you consider featuring this on [specific playlist/section]?"
6. **Length**: Under 150 words total. Busy curators scan, not read.`,
            source: 'manual',
            tags: ['outreach', 'email', 'pitch', 'strategy'],
        },
        {
            slug: 'platform-priorities-by-genre',
            title: 'Platform Priority by Genre',
            category: 'platform',
            content: `Where to focus PR by genre:
- **Amapiano**: Spotify + Apple Music + TikTok (dance challenges)
- **Hip-Hop**: Spotify + YouTube + Instagram (visual content)
- **Afrobeats**: Apple Music + Audiomack + TikTok
- **Drill/Grime**: YouTube + SoundCloud + Twitter/X
- **R&B**: Spotify + Apple Music + Instagram (aesthetic focus)
- **Pop**: TikTok + Spotify + Instagram Reels
- **Country**: Apple Music + YouTube + Facebook
- **Indie**: Bandcamp + SoundCloud + Spotify (indie editorial)
- **Latin**: YouTube + Spotify + TikTok`,
            source: 'manual',
            tags: ['platform', 'genre', 'strategy'],
        },
        {
            slug: 'brand-partnership-strategy',
            title: 'Brand Partnership & Sponsorship',
            category: 'outreach',
            content: `When looking for brand partnerships:
1. **Gather**: Brand/product, target audience, campaign goal (awareness vs conversions)
2. **Match criteria**: Verified influencers with high engagement rate (>3%), niche content creators, audience alignment
3. **Approach**: For brand awareness, prioritize reach. For conversions, prioritize engagement rate over follower count.
4. **Key metrics to present**: Engagement rate, audience demographics, past brand collaborations, content quality score
5. **Pricing guidance**: CPM (cost per 1000 impressions) benchmarks by platform and region`,
            source: 'manual',
            tags: ['brand', 'partnership', 'sponsorship', 'outreach'],
        },
        {
            slug: 'afrobeats-market-ng',
            title: 'Afrobeats Market - Nigeria',
            category: 'genre_specific',
            content: `Afrobeats PR in Nigeria:
- **Key platforms**: Audiomack (dominant in NG), Apple Music, Spotify, Boomplay
- **Top blogs & media**: NotJustOk, BellaNaija Music, Pulse Nigeria, The Native, tooXclusive
- **Radio**: Beat FM (99.9), Cool FM (96.9), Rhythm FM, Nigeria Info
- **Strategy**: Audiomack is king for discovery — upload early, push pre-saves. Apple Music editorial is critical for charting. Blog embeds drive SEO and Google discoverability.
- **Influencer tiers**: Nano (5K-50K): ₦20K-₦100K. Micro (50K-200K): ₦100K-₦500K. Macro (200K+): ₦500K+
- **Key contacts**: Music directors at radio, A&R at Mavin/Spaceship/YBNL, playlist editors at Audiomack NG
- **Timing**: New Music Friday is critical. Submit to DSPs 4 weeks early. Blog outreach Tuesday-Thursday.`,
            source: 'manual',
            tags: ['afrobeats', 'nigeria', 'ng', 'africa', 'genre', 'audiomack'],
        },
        {
            slug: 'hiphop-market-usa',
            title: 'Hip-Hop Market - USA',
            category: 'genre_specific',
            content: `Hip-Hop PR in the USA:
- **Key platforms**: Spotify, Apple Music, YouTube, SoundCloud, TIDAL
- **Top media**: Complex, Pitchfork, HotNewHipHop (HNHH), XXL, The FADER, Stereogum, Hypebeast
- **Radio**: Shade 45 (SiriusXM), Hot 97, Power 106, college radio (CMJ charts)
- **Strategy**: College radio is an underrated launchpad — CMJ charting gets A&R attention. WorldStar/HipHopDX for viral visibility. SoundCloud for underground credibility. Lyric videos on YouTube for SEO.
- **Key outlets for submissions**: SubmitHub (Pitchfork blogs), Groover, direct email pitches to editors
- **Blog embeds**: HNHH, DatPiff (mixtape culture), LiveMixtapes for street credibility
- **A&R pipeline**: Showcases (SXSW, A3C, Rolling Loud sideshows), Spotify editorial pitching, TikTok virality
- **Pricing**: Blog features $200-$2000. Playlist placements $100-$500/week. PR retainers $1500-$5000/month.`,
            source: 'manual',
            tags: ['hiphop', 'hip-hop', 'rap', 'usa', 'us', 'genre', 'complex', 'pitchfork'],
        },
        {
            slug: 'drill-grime-market-uk',
            title: 'Drill & Grime Market - UK',
            category: 'genre_specific',
            content: `UK Drill & Grime PR:
- **Key platforms**: YouTube (dominant), Spotify, Apple Music, SoundCloud
- **Top channels & media**: GRM Daily, Link Up TV, SBTV, Mixtape Madness, Pressplay Media, CLASH Magazine
- **Radio**: BBC 1Xtra (Charlie Sloth, Kenny Allstar), Rinse FM, Radar Radio, NTS
- **Strategy**: YouTube is THE platform — GRM Daily and Link Up TV premieres are career-defining. 1Xtra playlist/fire in the booth is a major milestone. Freestyle videos on SBTV/GRM are discovery engines.
- **Key contacts**: A&R at 0207 Def Jam, Since '93, Relentless, and independents. Promoters at Eskimo Dance, Boiler Room
- **Blog/media**: CLASH Magazine, Notion, Dummy Mag, Trench, Complex UK
- **Pricing**: GRM Daily video premiere £500-£2000. Link Up TV £300-£1500. Blog coverage £100-£500.
- **Community**: Twitter/X is critical for UK scene discourse. Build presence there.`,
            source: 'manual',
            tags: ['drill', 'grime', 'uk', 'united kingdom', 'genre', 'grm daily', 'youtube'],
        },
        {
            slug: 'rnb-soul-strategy',
            title: 'R&B & Soul Strategy',
            category: 'genre_specific',
            content: `R&B & Soul PR strategy:
- **Key platforms**: Spotify (editorial playlists are everything), Apple Music, YouTube, TIDAL
- **Target playlists**: Spotify's "R&B X", "Are & Be", "Chill R&B". Apple Music's "R&B Now", "The New R&B"
- **Top media**: SoulBounce, Rated R&B, Essence Magazine, Vibe Magazine, Singersroom, YouKnowIGotSoul
- **Strategy**: R&B thrives on aesthetic — invest in visuals, lyric videos, and behind-the-scenes content. Instagram aesthetic is critical. Spotify editorial submission 4 weeks before release with compelling pitch narrative.
- **Key events**: Essence Festival, Soul Train Awards season, GRAMMY consideration timing
- **Playlist curators**: Independent R&B curators on Spotify have massive influence — identify and pitch directly
- **Influencer approach**: Partner with lifestyle/fashion influencers who align with R&B aesthetic rather than just music influencers
- **Timing**: R&B performs well with Thursday night releases. Align with "vibe" moments — cuffing season, Valentine's, summer nights.`,
            source: 'manual',
            tags: ['rnb', 'r&b', 'soul', 'genre', 'spotify', 'playlists'],
        },
        {
            slug: 'getting-signed-strategy',
            title: 'Getting Signed - A&R Pipeline Strategy',
            category: 'campaign',
            content: `Strategy for getting signed to a label:
1. **EPK preparation**: Professional press kit with bio, high-res photos, streaming links, press clippings, social stats, and a compelling narrative
2. **Demo submission**: Research A&R contacts at target labels. Use LinkedIn, SubmitHub Pro, and industry events. Never send unsolicited MP3 attachments — always link to private streams.
3. **Showcase strategy**: Play industry showcases (SXSW, CMJ, A3C, The Great Escape, COLORS). These are A&R hunting grounds.
4. **Build leverage first**: Labels sign what's already working. Hit 100K monthly listeners, build a TikTok moment, chart on college radio, or sell out a local venue before approaching.
5. **Label etiquette**: Research the label's roster first. Explain why you fit their brand. Reference specific artists on their roster. Keep emails under 150 words.
6. **Management first**: Consider getting a manager or entertainment lawyer before approaching labels. They have existing relationships and can make warm introductions.
7. **Red flags**: Avoid labels asking for upfront money, 360 deals without clear value, or deals without legal review.`,
            source: 'manual',
            tags: ['signed', 'label', 'a&r', 'deal', 'management', 'epk', 'campaign'],
        },
        {
            slug: 'sync-licensing-guide',
            title: 'Sync Licensing & Music Supervision Guide',
            category: 'outreach',
            content: `Getting music placed in TV, film, and advertising:
1. **Music supervisors**: The gatekeepers. Research credits on IMDB, Guild of Music Supervisors directory, and LinkedIn. Key supes: Alexandra Patsavas, Randall Poster, Jen Malone.
2. **Sync agencies & libraries**: Musicbed, Artlist, Epidemic Sound (non-exclusive). For exclusive: Position Music, Terrorbird, Bank Robber Music.
3. **PROs**: Register with ASCAP, BMI, or SESAC (USA) / PRS (UK) / SAMRO (SA). This is how you get paid for broadcast usage.
4. **What supervisors want**: Clean masters (no uncleared samples), stems available, quick turnaround on licensing, instrumentals ready, lyrics that aren't too specific
5. **Pitch approach**: Short email, link to a curated playlist of 5-10 tracks that fit their current projects. Reference the show/film by name.
6. **Pricing**: Indie film $500-$5000. TV show $5000-$25000. Major ad campaign $25000-$500000+. Library placements: royalty-only to $500/track.
7. **Metadata**: Ensure all tracks have proper ISRC codes, correct writer/publisher splits, and are registered with your PRO before pitching.`,
            source: 'manual',
            tags: ['sync', 'licensing', 'tv', 'film', 'music supervisor', 'outreach', 'placement'],
        },
        {
            slug: 'epk-bio-writing',
            title: 'EPK & Artist Bio Writing Guide',
            category: 'outreach',
            content: `Creating an effective Electronic Press Kit (EPK) and artist bio:
1. **Bio framework**: Start with a hook (unique angle/achievement), then origin story (1-2 sentences), musical identity, notable achievements, and what's next. Three versions: 1-sentence, 1-paragraph, full page.
2. **EPK structure**: Artist bio, high-res press photos (landscape + portrait, minimum 300dpi), music links (streaming + private previews), press clippings/quotes, social media stats, booking/contact info, upcoming releases/tour dates
3. **One-sheet creation**: Single-page PDF with photo, key stats, streaming numbers, notable placements/press, and contact info. This is what booking agents and promoters want.
4. **Press photo specs**: Minimum 2000x3000px, both landscape and portrait crops, plain and editorial/lifestyle options, consistent visual brand
5. **Common mistakes**: Bios that read like Wikipedia entries. Photos that are blurry or poorly lit. Missing contact information. Broken streaming links. Stats that are outdated.
6. **Tools**: Canva for one-sheets, Google Drive/Dropbox for hosting, Linktree or custom landing page for EPK URL
7. **Update cadence**: Refresh EPK before every release cycle. Update stats quarterly. New photos at least twice a year.`,
            source: 'manual',
            tags: ['epk', 'bio', 'press kit', 'one-sheet', 'outreach', 'writing'],
        },
        {
            slug: 'social-media-growth',
            title: 'Social Media Growth Strategy for Artists',
            category: 'platform',
            content: `Platform-specific growth tactics for music artists:
- **TikTok**: Post 1-3x daily. Use trending sounds + your own music. Behind-the-scenes studio content outperforms polished posts. Duets and stitches boost discovery. Hashtag research: mix genre tags (#newmusic) with niche tags (#indieartist). Best posting: 7-9am and 7-11pm.
- **Instagram**: Reels are priority (algorithm favors video). Carousel posts for track breakdowns. Stories for daily engagement (polls, Q&A). Consistent aesthetic builds brand. Engage in comments for 15 min after posting.
- **YouTube**: Shorts for discovery, long-form for depth. Lyric videos, visualizers, and behind-the-scenes content. SEO matters — title, description, and tags. Community tab for engagement.
- **Twitter/X**: Real-time engagement with fans and industry. Quote-tweet other artists supportively. Spaces for live audio interactions. Thread format for storytelling.
- **Content calendar**: Plan 2 weeks ahead. Mix content types: 40% music/promo, 30% behind-scenes, 20% engagement/personality, 10% reposts/community. Batch-create content weekly.
- **Engagement optimization**: Reply to every comment for first 30 minutes. Use CTAs in captions. Cross-promote across platforms. Collaborate with artists at your level.`,
            source: 'manual',
            tags: ['social media', 'tiktok', 'instagram', 'youtube', 'twitter', 'growth', 'platform', 'content'],
        },
    ];

    let created = 0;
    for (const skill of initialSkills) {
        const id = await upsertSkill(skill);
        if (id) created++;
    }

    return created;
}

// ─── Helpers ─────────────────────────────────────────
function mapSkillFromDb(row: any): KnowledgeSkill {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        category: row.category,
        content: row.content,
        version: row.version || 1,
        source: row.source || 'manual',
        successCount: row.success_count || 0,
        usageCount: row.usage_count || 0,
        effectivenessScore: row.effectiveness_score || 0,
        status: row.status || 'active',
        tags: row.tags || [],
    };
}
