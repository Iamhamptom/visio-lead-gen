import { createSupabaseServerClient } from './supabase/server';

// The "God Mode" Context Pack Structure
// Mapped from the "Artist Portal" (Source of Truth) to "Visio PR Assistant" (Consumer)
export interface ContextPack {
    identity: {
        name: string;
        genre: string; // From identity.genres.primary
        subGenre?: string; // From identity.genres.secondary
        brandVoice: string; // From brand.voice.tone
        identityCheck?: any; // Allow passing the full identity check object
    };
    location: {
        city: string; // From identity.base.city
        country: string; // From identity.base.country
    };
    campaign: {
        budget: string; // From campaign.os.budget
        timeline: string; // From campaign.os.timeline
        goals: string[]; // From campaign.os.goals
    };
    assets: {
        epkUrl?: string;
        pressReleaseUrl?: string;
        driveUrl?: string; // From content.os.drive
    };
    policies: {
        causeAvoid: string[]; // From brand.policies.cause_avoid
    };
    story: {
        summary: string; // From story.origin_story.summary_bullets
    }
}

/**
 * Fetches the Artist Profile from Supabase and maps it to the God Mode Context Pack.
 * This ensures the PR Assistant only acts as a Consumer.
 */
export async function getContextPack(): Promise<ContextPack | null> {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile, error } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error || !profile) return null;

    // SCHEMA MAPPING LAYER
    // Mapping existing flat schema to the God Mode structure
    // As the Portal evolves, this mapping will become more direct (jsonb fields)

    // Unpack logic (handling potential JSON fields or flat columns)
    const socials = typeof profile.socials === 'object' ? profile.socials : {};
    const contextPayload = profile.context_packs?.pr_assistant?.payload;

    // Whitelist only the expected fields to prevent prompt-injection via DB payloads
    const sanitizePayload = (payload: any): ContextPack | null => {
        if (!payload || typeof payload !== 'object') return null;
        const safeGoals = Array.isArray(payload?.campaign?.goals)
            ? payload.campaign.goals.filter(Boolean)
            : [];

        return {
            identity: {
                name: payload.identity?.name ?? '',
                genre: payload.identity?.genre ?? '',
                subGenre: payload.identity?.subGenre ?? '',
                brandVoice: payload.identity?.brandVoice ?? ''
            },
            location: {
                city: payload.location?.city ?? '',
                country: payload.location?.country ?? ''
            },
            campaign: {
                budget: payload.campaign?.budget ?? '',
                timeline: payload.campaign?.timeline ?? '',
                goals: safeGoals
            },
            assets: {
                epkUrl: payload.assets?.epkUrl ?? '',
                pressReleaseUrl: payload.assets?.pressReleaseUrl ?? '',
                driveUrl: payload.assets?.driveUrl ?? ''
            },
            policies: {
                causeAvoid: Array.isArray(payload.policies?.causeAvoid) ? payload.policies.causeAvoid : []
            },
            story: {
                // Strip any markup/script to reduce prompt-injection risk
                summary: typeof payload.story?.summary === 'string'
                    ? payload.story.summary.replace(/<[^>]*>/g, '')
                    : ''
            }
        };
    };

    // 1. Prefer Direct Context Pack Payload if available (Future Proofing)
    const sanitized = sanitizePayload(contextPayload);
    if (sanitized) return sanitized;

    // 2. Fallback: Map from existing 'Legacy' Flat Schema
    return {
        identity: {
            name: profile.name,
            genre: profile.genre || '',
            subGenre: '', // Not consistently captured yet
            brandVoice: profile.brand_voice || '',
            identityCheck: profile.identity_check || null
        },
        location: {
            city: socials.location?.city || '',
            country: socials.location?.country || ''
        },
        campaign: {
            budget: socials.goals?.budgetRange || '',
            timeline: socials.goals?.timeline || '',
            goals: [socials.goals?.primaryGoal].filter(Boolean) as string[]
        },
        assets: {
            epkUrl: socials.website, // Using website as proxy for now
            pressReleaseUrl: '',
            driveUrl: ''
        },
        policies: {
            causeAvoid: [] // Safe default
        },
        story: {
            summary: profile.bio || profile.description || ''
        }
    };
}
