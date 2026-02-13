import { createClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient, createSupabaseServerClient } from './supabase/server';

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
export async function getContextPack(opts?: { userId?: string; accessToken?: string }): Promise<ContextPack | null> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const createAuthedAnonClient = (accessToken: string) => {
        if (!supabaseUrl || !anonKey) return null;
        return createClient(supabaseUrl, anonKey, {
            global: {
                headers: { Authorization: `Bearer ${accessToken}` }
            },
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
    };

    let userId = opts?.userId;
    const accessToken = opts?.accessToken;

    // If we have a bearer token, prefer it over cookie auth because the app's default client session
    // lives in localStorage (cookies are often absent in Route Handlers).
    if (!userId && accessToken) {
        const authed = createAuthedAnonClient(accessToken);
        if (authed) {
            const { data } = await authed.auth.getUser();
            userId = data.user?.id;
        }
    }

    // Cookie-based fallback (OAuth / SSR flows).
    if (!userId) {
        try {
            const supabase = await createSupabaseServerClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            userId = user.id;
        } catch {
            return null;
        }
    }

    // Prefer service role for reliability (doesn't depend on RLS), but fall back if it's not configured.
    let dbClient:
        | ReturnType<typeof createClient>
        | Awaited<ReturnType<typeof createSupabaseServerClient>>
        | ReturnType<typeof createSupabaseAdminClient>
        | null = null;

    try {
        dbClient = createSupabaseAdminClient();
    } catch {
        dbClient = accessToken ? createAuthedAnonClient(accessToken) : await createSupabaseServerClient();
    }

    if (!dbClient) return null;

    const { data: profile, error } = await dbClient
        .from('artist_profiles')
        .select('*')
        .eq('user_id', userId)
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
