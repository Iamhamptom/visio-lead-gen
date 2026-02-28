/**
 * Usage-Based Learning Engine
 *
 * Tracks interaction outcomes, builds pattern memory,
 * and feeds insights back into the AI for better responses.
 * This is the "reinforcement learning" loop.
 */

import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { recordSkillUsage } from '@/lib/knowledge-base';

// ─── Types ───────────────────────────────────────────
export type EventType =
    | 'positive_feedback'
    | 'negative_feedback'
    | 'successful_search'
    | 'failed_search'
    | 'lead_saved'
    | 'lead_ignored'
    | 'skill_used'
    | 'pattern_detected'
    | 'pitch_sent'
    | 'session_completed';

export type Outcome = 'success' | 'failure' | 'neutral';

export interface LearningEvent {
    userId?: string;
    sessionId?: string;
    eventType: EventType;
    query?: string;
    aiResponseSnippet?: string;
    skillId?: string;
    outcome: Outcome;
    score: number;          // -1 to 1
    patternKey?: string;
    patternData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface PatternInsight {
    patternKey: string;
    totalEvents: number;
    successRate: number;
    avgScore: number;
    bestQuery?: string;
    bestResponseApproach?: string;
    recommendedSkills: string[];
    confidence: number;
}

// ─── Pattern Key Generation ──────────────────────────
/**
 * Generate a pattern key from context.
 * Format: "genre:amapiano+country:ZA+intent:find_curators"
 */
export function generatePatternKey(context: {
    genre?: string;
    country?: string;
    intent?: string;
    category?: string;
}): string {
    const parts: string[] = [];
    if (context.genre) parts.push(`genre:${context.genre.toLowerCase().replace(/\s+/g, '_')}`);
    if (context.country) parts.push(`country:${context.country.toUpperCase()}`);
    if (context.intent) parts.push(`intent:${context.intent.toLowerCase()}`);
    if (context.category) parts.push(`cat:${context.category.toLowerCase()}`);
    return parts.join('+') || 'unknown';
}

// ─── Record Events ───────────────────────────────────

/** Record a learning event and update pattern memory */
export async function recordLearningEvent(event: LearningEvent): Promise<void> {
    try {
        const supabase = createSupabaseAdminClient();

        // 1. Insert the learning event
        await supabase.from('learning_events').insert({
            user_id: event.userId || null,
            session_id: event.sessionId || null,
            event_type: event.eventType,
            query: event.query || null,
            ai_response_snippet: event.aiResponseSnippet?.slice(0, 500) || null,
            skill_id: event.skillId || null,
            outcome: event.outcome,
            score: event.score,
            pattern_key: event.patternKey || null,
            pattern_data: event.patternData || {},
            metadata: event.metadata || {},
        });

        // 2. Update pattern memory if pattern key provided
        if (event.patternKey) {
            await updatePatternMemory(event.patternKey, event);
        }

        // 3. If a skill was involved, update skill effectiveness
        if (event.skillId) {
            await recordSkillUsage(event.skillId, event.outcome === 'success');
        }
    } catch (e) {
        console.error('[LearningEngine] Failed to record event:', e);
    }
}

// ─── Convenience Wrappers ────────────────────────────

/** Record positive feedback (user rated 4-5 stars) */
export async function recordPositiveFeedback(context: {
    userId?: string;
    sessionId?: string;
    query?: string;
    response?: string;
    genre?: string;
    country?: string;
    intent?: string;
    skillId?: string;
}): Promise<void> {
    const patternKey = generatePatternKey(context);
    await recordLearningEvent({
        userId: context.userId,
        sessionId: context.sessionId,
        eventType: 'positive_feedback',
        query: context.query,
        aiResponseSnippet: context.response,
        skillId: context.skillId,
        outcome: 'success',
        score: 1,
        patternKey,
        patternData: { genre: context.genre, country: context.country, intent: context.intent },
    });
}

/** Record negative feedback (user rated 1-2 stars) */
export async function recordNegativeFeedback(context: {
    userId?: string;
    sessionId?: string;
    query?: string;
    response?: string;
    genre?: string;
    country?: string;
    intent?: string;
    comment?: string;
}): Promise<void> {
    const patternKey = generatePatternKey(context);
    await recordLearningEvent({
        userId: context.userId,
        sessionId: context.sessionId,
        eventType: 'negative_feedback',
        query: context.query,
        aiResponseSnippet: context.response,
        outcome: 'failure',
        score: -1,
        patternKey,
        patternData: { genre: context.genre, country: context.country, intent: context.intent, comment: context.comment },
    });
}

/** Record a successful lead search (leads were saved by user) */
export async function recordSuccessfulSearch(context: {
    userId?: string;
    sessionId?: string;
    query?: string;
    resultsCount: number;
    savedCount: number;
    genre?: string;
    country?: string;
}): Promise<void> {
    const patternKey = generatePatternKey({ ...context, intent: 'lead_search' });
    const score = context.savedCount > 0 ? Math.min(context.savedCount / Math.max(context.resultsCount, 1), 1) : 0;
    await recordLearningEvent({
        userId: context.userId,
        sessionId: context.sessionId,
        eventType: context.savedCount > 0 ? 'successful_search' : 'failed_search',
        query: context.query,
        outcome: context.savedCount > 0 ? 'success' : 'failure',
        score,
        patternKey,
        patternData: { resultsCount: context.resultsCount, savedCount: context.savedCount, genre: context.genre, country: context.country },
    });
}

// ─── Pattern Memory ──────────────────────────────────

/** Update the accumulated pattern memory */
async function updatePatternMemory(patternKey: string, event: LearningEvent): Promise<void> {
    const supabase = createSupabaseAdminClient();

    // Get or create pattern
    const { data: existing } = await supabase
        .from('pattern_memory')
        .select('*')
        .eq('pattern_key', patternKey)
        .maybeSingle();

    if (existing) {
        // Update existing pattern
        const newTotal = (existing.total_events || 0) + 1;
        const newSuccessCount = (existing.success_count || 0) + (event.outcome === 'success' ? 1 : 0);
        const newFailureCount = (existing.failure_count || 0) + (event.outcome === 'failure' ? 1 : 0);
        const newAvgScore = ((existing.avg_score || 0) * (existing.total_events || 0) + event.score) / newTotal;
        const confidence = Math.min(newTotal / 20, 1); // Confidence grows with data, maxes at 20 events

        const updates: Record<string, unknown> = {
            total_events: newTotal,
            success_count: newSuccessCount,
            failure_count: newFailureCount,
            avg_score: Math.round(newAvgScore * 100) / 100,
            confidence: Math.round(confidence * 100) / 100,
            updated_at: new Date().toISOString(),
        };

        // If this was a successful search and the query looks better than what we have
        if (event.outcome === 'success' && event.query && event.score > (existing.avg_score || 0)) {
            updates.best_query = event.query;
        }

        await supabase
            .from('pattern_memory')
            .update(updates)
            .eq('id', existing.id);
    } else {
        // Create new pattern
        await supabase.from('pattern_memory').insert({
            pattern_key: patternKey,
            total_events: 1,
            success_count: event.outcome === 'success' ? 1 : 0,
            failure_count: event.outcome === 'failure' ? 1 : 0,
            avg_score: event.score,
            best_query: event.outcome === 'success' ? event.query : null,
            confidence: 0.05,
        });
    }
}

// ─── Pattern Queries ─────────────────────────────────

/** Get pattern insights for a given context */
export async function getPatternInsights(context: {
    genre?: string;
    country?: string;
    intent?: string;
}): Promise<PatternInsight | null> {
    const patternKey = generatePatternKey(context);
    const supabase = createSupabaseAdminClient();

    const { data } = await supabase
        .from('pattern_memory')
        .select('*')
        .eq('pattern_key', patternKey)
        .maybeSingle();

    if (!data || data.total_events < 2) return null;

    return {
        patternKey: data.pattern_key,
        totalEvents: data.total_events,
        successRate: data.total_events > 0 ? data.success_count / data.total_events : 0,
        avgScore: data.avg_score,
        bestQuery: data.best_query || undefined,
        bestResponseApproach: data.best_response_approach || undefined,
        recommendedSkills: data.recommended_skills || [],
        confidence: data.confidence,
    };
}

/** Get top performing patterns for admin dashboard */
export async function getTopPatterns(limit: number = 20): Promise<PatternInsight[]> {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
        .from('pattern_memory')
        .select('*')
        .gte('total_events', 3)
        .order('confidence', { ascending: false })
        .limit(limit);

    if (error || !data) return [];

    return data.map(d => ({
        patternKey: d.pattern_key,
        totalEvents: d.total_events,
        successRate: d.total_events > 0 ? d.success_count / d.total_events : 0,
        avgScore: d.avg_score,
        bestQuery: d.best_query || undefined,
        bestResponseApproach: d.best_response_approach || undefined,
        recommendedSkills: d.recommended_skills || [],
        confidence: d.confidence,
    }));
}

/** Format pattern insights for injection into AI prompt */
export function formatPatternsForPrompt(insight: PatternInsight | null): string {
    if (!insight || insight.confidence < 0.3) return '';

    const lines: string[] = ['## LEARNED PATTERN INSIGHT'];
    lines.push(`Based on ${insight.totalEvents} similar interactions (${Math.round(insight.successRate * 100)}% success rate):`);

    if (insight.bestQuery) {
        lines.push(`- **Best query format**: "${insight.bestQuery}"`);
    }
    if (insight.bestResponseApproach) {
        lines.push(`- **Best approach**: ${insight.bestResponseApproach}`);
    }
    if (insight.recommendedSkills.length > 0) {
        lines.push(`- **Recommended strategies**: ${insight.recommendedSkills.join(', ')}`);
    }

    return lines.join('\n');
}
