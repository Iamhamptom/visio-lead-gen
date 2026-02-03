import { createSupabaseServerClient } from './supabase/server';
import { ArtistProfile } from '@/app/types';

// The "God Mode" Context Pack Structure
// Mapped from the "Artist Portal" (Source of Truth) to "Visio PR Assistant" (Consumer)
export interface ContextPack {
    identity: {
        name: string;
        genre: string; // From identity.genres.primary
        subGenre?: string; // From identity.genres.secondary
        brandVoice: string; // From brand.voice.tone
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
    const socials = profile.socials || {};
    const metrics = profile.metrics || {};
    const contextPayload = profile.context_packs?.pr_assistant?.payload;

    // 1. Prefer Direct Context Pack Payload if available (Future Proofing)
    if (contextPayload) {
        return contextPayload as ContextPack;
    }

    // 2. Fallback: Map from existing 'Legacy' Flat Schema
    return {
        identity: {
            name: profile.name,
            genre: profile.genre || '',
            subGenre: '', // Not consistently captured yet
            brandVoice: 'Professional, Strategic, Authentic' // Default if missing
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
