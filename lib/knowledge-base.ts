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
