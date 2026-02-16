import { supabase } from './supabase/client';
import { ArtistProfile, Session, Message, Subscription, SubscriptionTier, Role, StrategyBrief } from '@/app/types';

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

export type SaveSessionsResult = { ok: true } | { ok: false; error: string };

function formatSupabaseError(error: any): string {
    if (!error) return 'Unknown error';
    const parts: string[] = [];
    if (typeof error.message === 'string') parts.push(error.message);
    if (typeof error.code === 'string') parts.push(`code=${error.code}`);
    if (typeof error.details === 'string' && error.details) parts.push(error.details);
    if (typeof error.hint === 'string' && error.hint) parts.push(error.hint);
    return parts.join(' | ') || String(error);
}

export async function saveSessions(sessions: Session[]): Promise<SaveSessionsResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated (no Supabase session)' };

    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    let hadError = false;
    let firstError: string | null = null;

    const recordError = (label: string, error: any) => {
        hadError = true;
        const formatted = `${label}: ${formatSupabaseError(error)}`;
        if (!firstError) firstError = formatted;
        console.error(formatted, error);
    };

    // Batch upsert all sessions in one call
    const sessionPayloads = sessions.map(session => ({
        id: session.id,
        user_id: user.id,
        title: session.title,
        folder_id: session.folderId,
        updated_at: new Date(session.lastUpdated).toISOString()
    }));

    if (sessionPayloads.length > 0) {
        const { error: sessionError } = await supabase
            .from('sessions')
            .upsert(sessionPayloads, { onConflict: 'id' });

        if (sessionError) {
            recordError('Error saving sessions', sessionError);
        }
    }

    // Batch upsert all messages across all sessions in one call
    const allMessages = sessions.flatMap(session =>
        session.messages
            .filter(msg => !msg.isThinking && !msg.isResearching)
            .filter(msg => isUuid(msg.id))
            .map(msg => ({
                id: msg.id,
                session_id: session.id,
                role: msg.role,
                content: msg.content,
                leads: msg.leads || [],
                created_at: new Date(msg.timestamp).toISOString()
            }))
    );

    if (allMessages.length > 0) {
        // Supabase has a payload size limit; batch in chunks of 500
        const BATCH_SIZE = 500;
        for (let i = 0; i < allMessages.length; i += BATCH_SIZE) {
            const batch = allMessages.slice(i, i + BATCH_SIZE);
            const { error: msgError } = await supabase
                .from('messages')
                .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

            if (msgError) {
                recordError('Error saving messages', msgError);
            }
        }
    }

    if (hadError) return { ok: false, error: firstError || 'Unknown Supabase write error' };
    return { ok: true };
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

    if (sessionsError || !sessionsData || sessionsData.length === 0) return [];

    // Load ALL messages for this user's sessions in a single query
    const sessionIds = sessionsData.map(s => s.id);
    const { data: allMessagesData } = await supabase
        .from('messages')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true });

    // Group messages by session_id
    const messagesBySession = new Map<string, typeof allMessagesData>();
    for (const msg of (allMessagesData || [])) {
        const existing = messagesBySession.get(msg.session_id) || [];
        existing.push(msg);
        messagesBySession.set(msg.session_id, existing);
    }

    return sessionsData.map(sessionData => ({
        id: sessionData.id,
        title: sessionData.title,
        folderId: sessionData.folder_id,
        lastUpdated: new Date(sessionData.updated_at).getTime(),
        messages: (messagesBySession.get(sessionData.id) || []).map(msg => ({
            id: msg.id,
            role: msg.role as Role,
            content: msg.content,
            leads: msg.leads,
            timestamp: new Date(msg.created_at).getTime()
        }))
    }));
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

    // Use updated_at as a non-destructive marker. The real signal is artist_profiles existence.
    const { error } = await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', user.id);

    return !error;
}

export async function checkOnboardingComplete(): Promise<boolean> {
    // Check if they have an artist profile — this is the canonical signal
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
        .select('subscription_tier, subscription_status, subscription_period_end')
        .eq('id', user.id)
        .maybeSingle();

    if (error || !data) {
        console.error('Error loading subscription:', error);
        return null;
    }

    let tier = (data.subscription_tier || 'artist') as SubscriptionTier;
    let status = (data.subscription_status || 'active') as 'active' | 'trialing' | 'past_due' | 'canceled';
    let currentPeriodEnd = data.subscription_period_end ? new Date(data.subscription_period_end).getTime() : 0;

    // Auto-reconcile from paid invoice history so paid customers are never stuck on free tier.
    try {
        const { data: latestPaid } = await supabase
            .from('invoices')
            .select('tier, paid_at, created_at')
            .eq('user_id', user.id)
            .eq('status', 'paid')
            .order('paid_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const paidTier = latestPaid?.tier as SubscriptionTier | undefined;
        const shouldPromoteFromInvoice =
            !!paidTier &&
            (tier === 'artist' || status === 'past_due' || status === 'canceled');

        if (shouldPromoteFromInvoice && paidTier) {
            tier = paidTier;
            status = 'active';

            const paidAtMs = latestPaid?.paid_at
                ? new Date(latestPaid.paid_at).getTime()
                : latestPaid?.created_at
                    ? new Date(latestPaid.created_at).getTime()
                    : Date.now();
            const inferredPeriodEnd = paidAtMs + (30 * 24 * 60 * 60 * 1000);
            currentPeriodEnd = currentPeriodEnd > 0 ? currentPeriodEnd : inferredPeriodEnd;

            await supabase
                .from('profiles')
                .update({
                    subscription_tier: tier,
                    subscription_status: 'active',
                    subscription_period_end: new Date(currentPeriodEnd).toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);
        }
    } catch (reconcileError) {
        // Best effort. Never block app load on invoice-history reconciliation.
        console.warn('Subscription invoice reconciliation skipped:', reconcileError);
    }

    return {
        tier,
        status,
        currentPeriodEnd,
        interval: 'month',
        paymentMethod: undefined
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

// ============ STRATEGY BRIEFS ============

export async function saveStrategyBrief(brief: StrategyBrief): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from('lead_list_briefs')
        .upsert({
            session_id: brief.sessionId,
            user_id: user.id,
            summary: brief.summary,
            target_audience: brief.targetAudience,
            objective: brief.objective,
            pitch_angle: brief.pitchAngle,
            country: brief.country || null,
            generated_at: new Date(brief.generatedAt).toISOString()
        }, { onConflict: 'session_id' });

    if (error) {
        console.error('Error saving strategy brief:', error);
        return false;
    }
    return true;
}

export async function loadStrategyBriefs(): Promise<Map<string, StrategyBrief>> {
    const { data: { user } } = await supabase.auth.getUser();
    const briefs = new Map<string, StrategyBrief>();
    if (!user) return briefs;

    const { data, error } = await supabase
        .from('lead_list_briefs')
        .select('*')
        .eq('user_id', user.id);

    if (error || !data) return briefs;

    for (const row of data) {
        briefs.set(row.session_id, {
            sessionId: row.session_id,
            summary: row.summary,
            targetAudience: row.target_audience || '',
            objective: row.objective || '',
            pitchAngle: row.pitch_angle || '',
            country: row.country || undefined,
            generatedAt: new Date(row.generated_at).getTime(),
        });
    }

    return briefs;
}

// ============ CAMPAIGN FOLDERS ============

export async function createFolder(name: string): Promise<{ id: string; name: string } | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
        .from('campaign_folders')
        .insert({ user_id: user.id, name })
        .select('id, name')
        .single();
    if (error) { console.error('Create folder error:', error); return null; }
    return data;
}

export async function loadFolders(): Promise<{ id: string; name: string; status: string }[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
        .from('campaign_folders')
        .select('id, name, status')
        .order('created_at', { ascending: false });
    if (error) { console.error('Load folders error:', error); return []; }
    return data || [];
}

export async function renameFolder(id: string, name: string): Promise<boolean> {
    const { error } = await supabase.from('campaign_folders').update({ name }).eq('id', id);
    return !error;
}

export async function deleteFolder(id: string): Promise<boolean> {
    const { error } = await supabase.from('campaign_folders').delete().eq('id', id);
    return !error;
}

// ============ LEAD REQUESTS (Admin Logging) ============

export async function logLeadRequest(params: {
    sessionId?: string;
    query: string;
    contactTypes?: string[];
    markets?: string[];
    genre?: string;
    targetCount?: number;
}): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('lead_requests')
        .insert({
            user_id: user.id,
            session_id: params.sessionId || null,
            query: params.query,
            contact_types: params.contactTypes || [],
            markets: params.markets || [],
            genre: params.genre || '',
            target_count: params.targetCount || 100,
            status: 'in_progress',
        })
        .select('id')
        .single();

    if (error) {
        console.error('Error logging lead request:', error);
        return null;
    }
    return data?.id || null;
}

export async function updateLeadRequestStatus(
    requestId: string,
    status: 'in_progress' | 'completed' | 'failed',
    resultsCount?: number
): Promise<boolean> {
    const { error } = await supabase
        .from('lead_requests')
        .update({
            status,
            results_count: resultsCount ?? 0,
            completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : undefined,
        })
        .eq('id', requestId);

    if (error) {
        console.error('Error updating lead request status:', error);
        return false;
    }
    return true;
}
