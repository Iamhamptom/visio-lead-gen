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
 * Returns true if the deduction succeeded, false if insufficient credits or error.
 */
export async function deductCredits(
    userId: string,
    amount: number,
    reason: string
): Promise<boolean> {
    if (amount <= 0) return true;

    const supabase = createSupabaseAdminClient();

    // Fetch current balance
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

    // Decrement balance and increment used
    const { error: updateError } = await supabase
        .from('profiles')
        .update({
            credits_balance: currentBalance - amount,
            credits_used: (profile.credits_used ?? 0) + amount,
        })
        .eq('id', userId);

    if (updateError) {
        console.error('deductCredits update error:', updateError);
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
