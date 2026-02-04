import { supabase } from './supabase/client';
import { ArtistProfile, Session, Message, Subscription, SubscriptionTier, Role } from '@/app/types';

/**
 * Supabase Data Service
 * Handles all user data persistence - replaces localStorage usage
 */

// ============ ARTIST PROFILES ============

export async function saveArtistProfile(profile: ArtistProfile): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Use a metadata object for fields that don't have direct columns
    // We'll overload 'metrics' or 'socials' if we can't change schema, 
    // or ideally we rely on the schema having them if we ran a migration.
    // For now, let's assume we can put extra data in 'metrics' or 'socials' is not strict.
    // Actually, to be safe and clean, let's keep 'socials' for socials, 'metrics' for milestones.
    // We'll stash other fields in a 'metadata' field if we can, but we don't have one in schema.
    // We will stick to the most important fields that match schema for now:
    // name, genre, bio -> description

    // We need to query for existing profile for this user to update it, or insert new.
    // Since we don't have the artist_profile ID in the frontend state usually,
    // we assume one profile per user for now (or is_primary).

    const { data: existing } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

    const payload: any = {
        user_id: user.id,
        name: profile.name,
        genre: profile.genre,
        bio: profile.description || '',
        socials: {
            ...profile.socials,
            connectedAccounts: profile.connectedAccounts,
            location: profile.location,
            promotionalFocus: profile.promotionalFocus,
            goals: profile.goals,
            careerHighlights: profile.careerHighlights,
            lifeHighlights: profile.lifeHighlights,
            desiredCommunities: profile.desiredCommunities,
            referralSource: profile.referralSource, // Marketing Data
            identityCheck: profile.identityCheck,
            website: profile.website,
            email: profile.socials?.email // Explicitly save email
        },
        metrics: profile.milestones || {},
        updated_at: new Date().toISOString()
    };

    if (existing) {
        payload.id = existing.id;
    }

    const { error } = await supabase
        .from('artist_profiles')
        .upsert(payload, { onConflict: 'id' });

    if (error) {
        console.error('Error saving artist profile:', error);
        return false;
    }
    return true;
}

export async function loadArtistProfile(): Promise<ArtistProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;

    // Unpack the stuffed socials/metadata
    const compoundSocials = data.socials || {};

    return {
        name: data.name,
        genre: data.genre,
        description: data.bio || '',
        socials: {
            instagram: compoundSocials.instagram,
            twitter: compoundSocials.twitter,
            youtube: compoundSocials.youtube,
            tiktok: compoundSocials.tiktok,
            linkedin: compoundSocials.linkedin,
            website: compoundSocials.website,
            email: compoundSocials.email
        },
        identityCheck: compoundSocials.identityCheck,
        connectedAccounts: compoundSocials.connectedAccounts || {},
        similarArtists: [], // schema doesn't have this, maybe add to payload above?
        milestones: data.metrics || {},
        location: compoundSocials.location || { city: '', country: '' },
        promotionalFocus: compoundSocials.promotionalFocus || 'Streaming',
        goals: compoundSocials.goals,
        careerHighlights: compoundSocials.careerHighlights || [],
        lifeHighlights: compoundSocials.lifeHighlights || [],
        desiredCommunities: compoundSocials.desiredCommunities || [],
        referralSource: compoundSocials.referralSource,
        website: compoundSocials.website
    };
}

// ============ CHAT SESSIONS ============

export async function saveSessions(sessions: Session[]): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    let hadError = false;

    // Save each session and its messages
    for (const session of sessions) {
        // Upsert session
        const { error: sessionError } = await supabase
            .from('sessions')
            .upsert({
                id: session.id,
                user_id: user.id,
                title: session.title,
                folder_id: session.folderId,
                updated_at: new Date(session.lastUpdated).toISOString()
            }, { onConflict: 'id' });

        if (sessionError) {
            console.error('Error saving session:', sessionError);
            hadError = true;
            continue;
        }

        // Save messages for this session
        const messagesToUpsert = session.messages
            // Don't persist transient "thinking" placeholders (DB schema has no isThinking flag).
            .filter(msg => !msg.isThinking)
            // Defensive: Supabase schema uses UUID ids; skip invalid ids so one bad message doesn't block persistence.
            .filter(msg => isUuid(msg.id))
            .map(msg => ({
                id: msg.id,
                session_id: session.id,
                role: msg.role, // 'user' | 'model'
                content: msg.content,
                leads: msg.leads || [], // Add leads support
                created_at: new Date(msg.timestamp).toISOString()
            }));

        if (messagesToUpsert.length > 0) {
            const { error: msgError } = await supabase
                .from('messages')
                .upsert(messagesToUpsert, { onConflict: 'id', ignoreDuplicates: true });

            if (msgError) {
                console.error('Error saving messages:', msgError);
                hadError = true;
            }
        }
    }

    return !hadError;
}

export async function loadSessions(): Promise<Session[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Load all sessions for user
    const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

    if (sessionsError || !sessionsData) return [];

    // Load messages for each session
    const sessions: Session[] = [];
    for (const sessionData of sessionsData) {
        const { data: messagesData } = await supabase
            .from('messages')
            .select('*')
            .eq('session_id', sessionData.id)
            .order('created_at', { ascending: true });

        sessions.push({
            id: sessionData.id,
            title: sessionData.title,
            folderId: sessionData.folder_id,
            lastUpdated: new Date(sessionData.updated_at).getTime(),
            messages: (messagesData || []).map(msg => ({
                id: msg.id,
                role: msg.role as Role,
                content: msg.content,
                leads: msg.leads,
                timestamp: new Date(msg.created_at).getTime()
            }))
        });
    }

    return sessions;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
    const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

    return !error;
}

// ============ ONBOARDING STATUS ============

export async function saveOnboardingComplete(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: 'active' }) // Hack: using a field we can write to, ideally add 'onboarding_complete' column
        .eq('id', user.id);

    return !error;
}

export async function checkOnboardingComplete(): Promise<boolean> {
    // Check if they have an artist profile, that's a good proxy
    const profile = await loadArtistProfile();
    return !!profile;
}

// ============ SUBSCRIPTION ============

export async function updateSubscription(subscription: Partial<Subscription>): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const updates: any = {};
    if (subscription.tier) updates.subscription_tier = subscription.tier;
    if (subscription.status) updates.subscription_status = subscription.status;
    if (subscription.currentPeriodEnd) updates.subscription_period_end = new Date(subscription.currentPeriodEnd).toISOString();

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

    return !error;
}

// ============ PAYMENT METHODS ============

export async function updatePaymentMethod(method: { token: string; brand: string; last4: string; expiry?: string }): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // We store payment details in the profiles table
    // Assuming columns exist: payment_token, card_brand, card_last4, card_expiry
    const { error } = await supabase
        .from('profiles')
        .update({
            payment_token: method.token,
            card_brand: method.brand,
            card_last4: method.last4,
            card_expiry: method.expiry
        })
        .eq('id', user.id);

    if (error) {
        console.error('Error updating payment method:', error);
        return false;
    }
    return true;
}

export async function loadSubscription(): Promise<Subscription | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_period_end, payment_token, card_brand, card_last4, card_expiry')
        .eq('id', user.id)
        .single();

    if (error || !data) return null;

    return {
        tier: data.subscription_tier as SubscriptionTier,
        status: data.subscription_status as 'active' | 'trialing' | 'past_due' | 'canceled',
        currentPeriodEnd: data.subscription_period_end ? new Date(data.subscription_period_end).getTime() : 0,
        interval: 'month',
        paymentMethod: data.payment_token ? {
            token: data.payment_token,
            brand: data.card_brand || 'Card',
            last4: data.card_last4 || '****',
            expiry: data.card_expiry || ''
        } : undefined
    };
}

// ============ SAVED LEADS ============

export async function saveLeads(leads: any[]): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const leadsToUpsert = leads.map(lead => ({
        id: lead.id,
        user_id: user.id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        title: lead.title,
        source: lead.source,
        metadata: lead.metadata || {},
        created_at: new Date().toISOString()
    }));

    const { error } = await supabase
        .from('saved_leads')
        .upsert(leadsToUpsert, { onConflict: 'id' });

    return !error;
}

export async function loadLeads(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('saved_leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return data || [];
}

// ============ SEARCH ANALYTICS ============

export async function logSearchQuery(query: string, country: string, resultsCount: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Anonymous searches not logged for now, or log without user_id

    await supabase.from('search_logs').insert({
        user_id: user.id,
        query,
        country,
        results_count: resultsCount,
        created_at: new Date().toISOString()
    });
}
