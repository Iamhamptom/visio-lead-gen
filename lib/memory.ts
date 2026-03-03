/**
 * Memory System
 *
 * Provides conversation memory (semantic search over past turns),
 * user memory (facts, preferences, goals), and voice transcript storage.
 * All writes are designed to be fire-and-forget (non-blocking).
 */

import { embedText } from '@/lib/rag';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { extractMemoriesFromTurn } from '@/lib/memory-extractor';

// ─── Types ───────────────────────────────────────────

interface ConversationTurnInput {
    userId: string;
    sessionId: string;
    userMessageId: string;
    userContent: string;
    agentContent: string;
}

interface MemorySearchResult {
    id: string;
    sessionId?: string;
    text: string;
    role: string;
    similarity: number;
    createdAt: string;
}

interface UserMemory {
    id: string;
    category: string;
    content: string;
    source: string;
    confidence: number;
    timesReferenced: number;
    similarity?: number;
}

interface SessionContext {
    conversationMemory: string;
    userMemory: string;
}

// ─── Conversation Memory ─────────────────────────────

/**
 * Embed a conversation turn (user Q + agent A) as a single vector.
 * Skips trivial messages under 20 chars. Fire-and-forget.
 */
export async function embedConversationTurn(input: ConversationTurnInput): Promise<void> {
    const { userId, sessionId, userMessageId, userContent, agentContent } = input;

    // Skip trivial messages
    if ((userContent + agentContent).length < 20) return;

    try {
        const combinedText = `User: ${userContent}\nAssistant: ${agentContent}`;
        const embedding = await embedText(combinedText);
        if (!embedding || embedding.length === 0) return;

        const supabase = createSupabaseAdminClient();
        await supabase.from('message_embeddings').insert({
            user_id: userId,
            session_id: sessionId,
            message_id: userMessageId,
            embedded_text: combinedText.slice(0, 4000), // Cap stored text
            embedding,
            role: 'turn',
        });
    } catch (e) {
        console.error('[Memory] Failed to embed conversation turn:', e);
    }
}

/**
 * Semantic search over past conversation turns for a user.
 */
export async function searchConversationMemory(params: {
    userId: string;
    query: string;
    limit?: number;
    threshold?: number;
    excludeSessionId?: string;
}): Promise<MemorySearchResult[]> {
    const { userId, query, limit = 5, threshold = 0.5, excludeSessionId } = params;

    try {
        const embedding = await embedText(query);
        if (!embedding || embedding.length === 0) return [];

        const supabase = createSupabaseAdminClient();
        const { data, error } = await supabase.rpc('match_message_memory', {
            p_user_id: userId,
            query_embedding: embedding,
            match_threshold: threshold,
            match_count: limit + (excludeSessionId ? 5 : 0), // Fetch extra if filtering
        });

        if (error || !data) return [];

        let results = data.map((row: any) => ({
            id: row.id,
            sessionId: row.session_id,
            text: row.embedded_text,
            role: row.role,
            similarity: row.similarity,
            createdAt: row.created_at,
        }));

        // Filter out current session if requested
        if (excludeSessionId) {
            results = results.filter((r: MemorySearchResult) => r.sessionId !== excludeSessionId);
        }

        return results.slice(0, limit);
    } catch (e) {
        console.error('[Memory] Conversation search failed:', e);
        return [];
    }
}

/**
 * Format conversation memories for injection into the agent prompt.
 */
export function formatConversationMemoryForPrompt(memories: MemorySearchResult[]): string {
    if (memories.length === 0) return '';

    const lines = ['## RELEVANT PAST CONVERSATIONS'];
    for (const mem of memories) {
        const date = new Date(mem.createdAt).toLocaleDateString();
        lines.push(`[${date}] ${mem.text.slice(0, 500)}`);
        lines.push('');
    }
    return lines.join('\n');
}

// ─── User Memory ─────────────────────────────────────

/**
 * Get user memories, optionally filtered by query (semantic) or category.
 */
export async function getUserMemories(params: {
    userId: string;
    query?: string;
    category?: string;
    limit?: number;
}): Promise<UserMemory[]> {
    const { userId, query, category, limit = 10 } = params;
    const supabase = createSupabaseAdminClient();

    try {
        // Semantic search if query provided
        if (query) {
            const embedding = await embedText(query);
            if (!embedding || embedding.length === 0) return [];

            const { data, error } = await supabase.rpc('match_user_memory', {
                p_user_id: userId,
                query_embedding: embedding,
                match_threshold: 0.4,
                match_count: limit,
            });

            if (error || !data) return [];

            // Increment times_referenced for retrieved memories (fire-and-forget)
            for (const row of data) {
                Promise.resolve(
                    supabase
                        .from('user_memory')
                        .update({ times_referenced: (row.times_referenced || 0) + 1 })
                        .eq('id', row.id)
                ).catch(() => {});
            }

            return data.map((row: any) => ({
                id: row.id,
                category: row.category,
                content: row.content,
                source: row.source,
                confidence: row.confidence,
                timesReferenced: row.times_referenced,
                similarity: row.similarity,
            }));
        }

        // Non-semantic: top by confidence
        let queryBuilder = supabase
            .from('user_memory')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('confidence', { ascending: false })
            .limit(limit);

        if (category) {
            queryBuilder = queryBuilder.eq('category', category);
        }

        const { data, error } = await queryBuilder;
        if (error || !data) return [];

        return data.map((row: any) => ({
            id: row.id,
            category: row.category,
            content: row.content,
            source: row.source,
            confidence: row.confidence,
            timesReferenced: row.times_referenced,
        }));
    } catch (e) {
        console.error('[Memory] getUserMemories failed:', e);
        return [];
    }
}

/**
 * Format user memories for injection into the agent prompt.
 */
export function formatUserMemoryForPrompt(memories: UserMemory[]): string {
    if (memories.length === 0) return '';

    const lines = ['## WHAT I KNOW ABOUT YOU'];
    const byCategory: Record<string, string[]> = {};

    for (const mem of memories) {
        if (!byCategory[mem.category]) byCategory[mem.category] = [];
        byCategory[mem.category].push(mem.content);
    }

    for (const [cat, items] of Object.entries(byCategory)) {
        lines.push(`**${cat}**: ${items.join('; ')}`);
    }

    return lines.join('\n');
}

/**
 * Store a user memory. Checks for duplicates via cosine similarity (>0.9 = supersede).
 */
export async function storeUserMemory(params: {
    userId: string;
    category: string;
    content: string;
    source: string;
    sessionId?: string;
    confidence?: number;
}): Promise<void> {
    const { userId, category, content, source, sessionId, confidence = 0.7 } = params;

    try {
        const embedding = await embedText(content);
        if (!embedding || embedding.length === 0) return;

        const supabase = createSupabaseAdminClient();

        // Check for near-duplicate (>0.9 similarity)
        const { data: existing } = await supabase.rpc('match_user_memory', {
            p_user_id: userId,
            query_embedding: embedding,
            match_threshold: 0.9,
            match_count: 1,
        });

        if (existing && existing.length > 0) {
            // Supersede the old memory
            const oldId = existing[0].id;
            const { data: newMem } = await supabase
                .from('user_memory')
                .insert({
                    user_id: userId,
                    category,
                    content,
                    embedding,
                    source,
                    source_session_id: sessionId || null,
                    confidence: Math.max(confidence, existing[0].confidence),
                    times_referenced: existing[0].times_referenced || 0,
                    is_active: true,
                })
                .select('id')
                .single();

            if (newMem) {
                await supabase
                    .from('user_memory')
                    .update({ is_active: false, superseded_by: newMem.id })
                    .eq('id', oldId);
            }
        } else {
            // Insert new memory
            await supabase.from('user_memory').insert({
                user_id: userId,
                category,
                content,
                embedding,
                source,
                source_session_id: sessionId || null,
                confidence,
                is_active: true,
            });
        }
    } catch (e) {
        console.error('[Memory] storeUserMemory failed:', e);
    }
}

// ─── Session Context Builder ─────────────────────────

/**
 * Build full memory context for a session. Parallel fan-out over:
 * - Conversation memory (past turns from other sessions)
 * - User memory (facts, preferences, goals)
 */
export async function buildSessionContext(params: {
    userId: string;
    currentMessage: string;
    sessionId: string;
}): Promise<SessionContext> {
    const { userId, currentMessage, sessionId } = params;

    try {
        const [conversationResults, userMemories] = await Promise.all([
            searchConversationMemory({
                userId,
                query: currentMessage,
                limit: 5,
                threshold: 0.5,
                excludeSessionId: sessionId,
            }),
            getUserMemories({ userId, query: currentMessage, limit: 10 }),
        ]);

        return {
            conversationMemory: formatConversationMemoryForPrompt(conversationResults),
            userMemory: formatUserMemoryForPrompt(userMemories),
        };
    } catch (e) {
        console.error('[Memory] buildSessionContext failed:', e);
        return { conversationMemory: '', userMemory: '' };
    }
}

// ─── Extract & Store User Memories ───────────────────

/**
 * Extract user facts/preferences from a conversation turn and store them.
 * Uses keyword pre-filter + Claude Haiku extraction. Fire-and-forget.
 */
export async function extractAndStoreUserMemories(params: {
    userId: string;
    sessionId: string;
    userMessage: string;
    agentResponse: string;
}): Promise<void> {
    const { userId, sessionId, userMessage, agentResponse } = params;

    try {
        // Get existing memories for dedup context
        const existing = await getUserMemories({ userId, limit: 5 });

        const extracted = await extractMemoriesFromTurn({
            userMessage,
            agentResponse,
            existingMemories: existing.map(m => m.content),
        });

        if (!extracted || extracted.length === 0) return;

        // Store each extracted memory
        for (const mem of extracted) {
            await storeUserMemory({
                userId,
                category: mem.category,
                content: mem.content,
                source: 'conversation',
                sessionId,
                confidence: mem.confidence,
            });
        }

        console.log(`[Memory] Extracted ${extracted.length} memories from conversation`);
    } catch (e) {
        console.error('[Memory] extractAndStoreUserMemories failed:', e);
    }
}

// ─── Voice Call Transcripts ──────────────────────────

/**
 * Store a voice call transcript, generate a summary via Claude Haiku,
 * embed the summary, and extract user memories.
 */
export async function storeVoiceCallTranscript(params: {
    userId: string;
    sessionId?: string;
    transcript: { role: string; text: string }[];
    durationSeconds: number;
}): Promise<void> {
    const { userId, sessionId, transcript, durationSeconds } = params;

    if (!transcript || transcript.length < 2) return;

    try {
        const supabase = createSupabaseAdminClient();

        // Generate summary using Claude Haiku
        const { getClient, getModel } = await import('@/lib/claude');
        const client = getClient();

        const transcriptText = transcript
            .map(t => `${t.role}: ${t.text}`)
            .join('\n');

        const summaryResponse = await client.messages.create({
            model: getModel('instant'),
            max_tokens: 300,
            system: 'Summarize this voice call transcript in 2-3 sentences. Focus on key topics discussed, decisions made, and any user preferences or goals mentioned.',
            messages: [{ role: 'user', content: transcriptText.slice(0, 3000) }],
        });

        const summary = summaryResponse.content
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('');

        // Embed the summary
        const summaryEmbedding = summary ? await embedText(summary) : [];

        // Insert transcript record
        await supabase.from('voice_call_transcripts').insert({
            user_id: userId,
            session_id: sessionId || null,
            duration_seconds: durationSeconds,
            exchange_count: transcript.length,
            transcript,
            summary,
            summary_embedding: summaryEmbedding.length > 0 ? summaryEmbedding : null,
        });

        // Extract user memories from the conversation
        const userMessages = transcript.filter(t => t.role === 'user').map(t => t.text).join(' ');
        const agentMessages = transcript.filter(t => t.role === 'agent').map(t => t.text).join(' ');

        if (userMessages.length > 20) {
            await extractAndStoreUserMemories({
                userId,
                sessionId: sessionId || '',
                userMessage: userMessages,
                agentResponse: agentMessages,
            });
        }

        console.log(`[Memory] Stored voice transcript (${transcript.length} exchanges, ${durationSeconds}s)`);
    } catch (e) {
        console.error('[Memory] storeVoiceCallTranscript failed:', e);
    }
}
