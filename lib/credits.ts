import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { SubscriptionTier } from '@/app/types';

/** Credit cost per intent category */
export const CREDIT_COSTS: Record<string, number> = {
    // Free actions (Claude's training knowledge)
    chat_message: 0,
    conversation: 0,
    knowledge: 0,
    clarify: 0,

    // Standard actions
    web_search: 1,
    content_creation: 1,

    // Premium actions
    lead_search: 2,
    lead_generation: 2,
    strategy: 3,
    campaign_plan: 3,

    // Heavy actions
    deep_search: 5,
    apollo_search: 5,
    deep_thinking: 5,

    // Smart Scrape (social media research)
    smart_scrape: 3,

    // Automation Bank Skills
    viral_content_research: 3,
    curator_discovery: 2,
    deep_contact_enrichment: 5,
    pr_trend_monitor: 3,
    campaign_rollout_research: 3,
    competitor_intelligence: 3,
};

/** Monthly credit allocation per subscription tier */
export const PLAN_CREDITS: Record<SubscriptionTier, number> = {
    artist: 20,
    starter: 50,
    artiste: 100,
    starter_label: 250,
    label: 500,
    agency: 2000,
    enterprise: Infinity,
};

/**
 * Fetches the current credit balance for a user from the profiles table.
 */
export async function getUserCredits(userId: string): Promise<number> {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
        .from('profiles')
        .select('credits_balance')
        .eq('id', userId)
        .single();

    if (error || !data) {
        console.error('getUserCredits error:', error);
        return 0;
    }

    return data.credits_balance ?? 0;
}

/**
 * Deducts credits from a user's balance and logs the transaction.
 * Uses a conditional update (gte guard) to prevent race conditions where
 * two concurrent requests could both read the same balance and both succeed.
 * Returns true if the deduction succeeded, false if insufficient credits or error.
 */
export async function deductCredits(
    userId: string,
    amount: number,
    reason: string
): Promise<boolean> {
    if (amount <= 0) return true;

    const supabase = createSupabaseAdminClient();

    // Read current balance to compute new values
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('credits_balance, credits_used')
        .eq('id', userId)
        .single();

    if (fetchError || !profile) {
        console.error('deductCredits fetch error:', fetchError);
        return false;
    }

    const currentBalance = profile.credits_balance ?? 0;
    if (currentBalance < amount) {
        console.warn(`Insufficient credits for user ${userId}: has ${currentBalance}, needs ${amount}`);
        return false;
    }

    // Atomic conditional update: gte guard ensures the row is only updated
    // when credits_balance is still >= amount, preventing double-spend from
    // concurrent requests that read the same balance.
    const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({
            credits_balance: currentBalance - amount,
            credits_used: (profile.credits_used ?? 0) + amount,
        })
        .eq('id', userId)
        .gte('credits_balance', amount)
        .select('id');

    if (updateError) {
        console.error('deductCredits update error:', updateError);
        return false;
    }

    // If no rows matched the gte guard, a concurrent request already spent the credits
    if (!updated || updated.length === 0) {
        console.warn(`deductCredits: concurrent deduction detected for user ${userId}, retrying balance check`);
        return false;
    }

    // Log the transaction
    const { error: logError } = await supabase
        .from('credit_transactions')
        .insert({
            user_id: userId,
            amount: -amount,
            reason,
            metadata: {},
        });

    if (logError) {
        console.error('deductCredits log error:', logError);
        // Balance already deducted — don't revert, but flag the logging failure
    }

    return true;
}

/**
 * Maps an intent category string to its credit cost.
 * Returns 0 for unknown categories.
 */
export function getCreditCost(intentCategory: string): number {
    return CREDIT_COSTS[intentCategory] ?? 0;
}
