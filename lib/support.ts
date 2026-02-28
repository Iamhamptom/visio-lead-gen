/**
 * Customer Support & Feedback System
 *
 * Handles support tickets, user feedback on AI responses,
 * and FAQ-based auto-resolution.
 */

import { createSupabaseAdminClient } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────
export type TicketCategory = 'general' | 'billing' | 'bug_report' | 'feature_request' | 'account' | 'technical';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'awaiting_reply' | 'resolved' | 'closed';
export type FeedbackType = 'response' | 'search_result' | 'lead_quality' | 'general' | 'bug_report';

export interface CreateTicketParams {
    userId: string;
    subject: string;
    description: string;
    category?: TicketCategory;
    priority?: TicketPriority;
    sessionId?: string;
    pageUrl?: string;
    browserInfo?: string;
}

export interface SubmitFeedbackParams {
    userId: string;
    sessionId?: string;
    messageId?: string;
    rating: number;
    feedbackType?: FeedbackType;
    comment?: string;
    aiResponseSnippet?: string;
    queryContext?: string;
}

// ─── FAQ Auto-Resolution ─────────────────────────────
const FAQ_ENTRIES = [
    {
        keywords: ['reset password', 'forgot password', 'change password', 'cant login', 'can\'t log in'],
        answer: 'You can reset your password by clicking "Forgot Password" on the login page. A reset link will be sent to your email. If you\'re still having trouble, please submit a ticket and we\'ll help you out.',
        category: 'account' as TicketCategory,
    },
    {
        keywords: ['credits', 'how many credits', 'credit balance', 'out of credits', 'no credits'],
        answer: 'Your credit balance resets monthly based on your subscription tier. Artist (Free): 20 credits, Starter: 50, Artiste: 100, Starter Label: 250, Label: 500, Agency: 2000, Enterprise: Unlimited. You can check your balance in the billing section.',
        category: 'billing' as TicketCategory,
    },
    {
        keywords: ['cancel', 'unsubscribe', 'stop subscription', 'cancel plan'],
        answer: 'To cancel your subscription, go to Settings > Billing and click "Cancel Subscription". Your access continues until the end of your current billing period. If you need help, submit a ticket.',
        category: 'billing' as TicketCategory,
    },
    {
        keywords: ['upgrade', 'change plan', 'switch plan', 'higher tier'],
        answer: 'To upgrade your plan, go to the Billing page and select your desired tier. Your new credit allocation will apply immediately after payment.',
        category: 'billing' as TicketCategory,
    },
    {
        keywords: ['search not working', 'no results', 'empty results', 'nothing found'],
        answer: 'If searches return no results, try: 1) Being more specific with genre and country, 2) Using different keywords, 3) Checking your credit balance. If the issue persists, it may be a temporary API issue — please try again in a few minutes.',
        category: 'technical' as TicketCategory,
    },
    {
        keywords: ['export', 'download leads', 'csv', 'excel'],
        answer: 'You can export your saved leads by going to the Leads section and clicking the export/download button. Leads are exported in CSV format.',
        category: 'general' as TicketCategory,
    },
    {
        keywords: ['voice', 'text to speech', 'read aloud', 'speaker'],
        answer: 'Click the speaker icon on any AI response to hear it read aloud. The voice feature uses ElevenLabs for natural-sounding speech.',
        category: 'general' as TicketCategory,
    },
];

/** Check if a ticket matches a FAQ and return auto-answer if so */
export function checkFaqMatch(subject: string, description: string): { answer: string; category: TicketCategory } | null {
    const combined = `${subject} ${description}`.toLowerCase();
    for (const faq of FAQ_ENTRIES) {
        if (faq.keywords.some(kw => combined.includes(kw))) {
            return { answer: faq.answer, category: faq.category };
        }
    }
    return null;
}

// ─── Support Tickets ─────────────────────────────────

/** Create a new support ticket */
export async function createSupportTicket(params: CreateTicketParams): Promise<{ ticketId: string; autoAnswer?: string } | null> {
    const supabase = createSupabaseAdminClient();

    // Check FAQ first
    const faqMatch = checkFaqMatch(params.subject, params.description);

    // Auto-detect priority from keywords
    let priority = params.priority || 'normal';
    const combined = `${params.subject} ${params.description}`.toLowerCase();
    if (combined.includes('urgent') || combined.includes('payment failed') || combined.includes('cant access')) {
        priority = 'high';
    }

    const { data, error } = await supabase
        .from('support_tickets')
        .insert({
            user_id: params.userId,
            subject: params.subject,
            description: params.description,
            category: params.category || faqMatch?.category || 'general',
            priority,
            status: faqMatch ? 'resolved' : 'open',
            session_id: params.sessionId || null,
            page_url: params.pageUrl || null,
            browser_info: params.browserInfo || null,
            resolved_at: faqMatch ? new Date().toISOString() : null,
            resolution_notes: faqMatch ? 'Auto-resolved via FAQ' : null,
        })
        .select('id')
        .single();

    if (error) {
        console.error('[Support] Failed to create ticket:', error);
        return null;
    }

    const ticketId = data?.id;
    if (!ticketId) return null;

    // If FAQ matched, add system auto-reply message
    if (faqMatch) {
        await supabase.from('support_messages').insert({
            ticket_id: ticketId,
            sender_type: 'system',
            content: faqMatch.answer,
        });
    }

    return { ticketId, autoAnswer: faqMatch?.answer };
}

/** Get user's support tickets */
export async function getUserTickets(userId: string): Promise<any[]> {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Support] Failed to load tickets:', error);
        return [];
    }
    return data || [];
}

/** Get messages for a ticket */
export async function getTicketMessages(ticketId: string): Promise<any[]> {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    if (error) return [];
    return data || [];
}

/** Add a message to a ticket */
export async function addTicketMessage(
    ticketId: string,
    senderType: 'user' | 'admin' | 'system',
    content: string,
    senderId?: string
): Promise<boolean> {
    const supabase = createSupabaseAdminClient();

    const { error: msgError } = await supabase
        .from('support_messages')
        .insert({
            ticket_id: ticketId,
            sender_type: senderType,
            sender_id: senderId || null,
            content,
        });

    if (msgError) return false;

    // Update ticket status based on who replied
    const newStatus = senderType === 'admin' ? 'awaiting_reply' : 'open';
    await supabase
        .from('support_tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

    return true;
}

/** Admin: get all open tickets */
export async function getAllOpenTickets(limit: number = 50): Promise<any[]> {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
        .from('support_tickets')
        .select('*, profiles(email, name)')
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: true })
        .limit(limit);

    if (error) return [];
    return data || [];
}

// ─── Feedback System ─────────────────────────────────

/** Submit user feedback on an AI response */
export async function submitFeedback(params: SubmitFeedbackParams): Promise<string | null> {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
        .from('feedback')
        .insert({
            user_id: params.userId,
            session_id: params.sessionId || null,
            message_id: params.messageId || null,
            rating: params.rating,
            feedback_type: params.feedbackType || 'response',
            comment: params.comment || null,
            ai_response_snippet: params.aiResponseSnippet?.slice(0, 500) || null,
            query_context: params.queryContext || null,
        })
        .select('id')
        .single();

    if (error) {
        console.error('[Feedback] Failed to submit:', error);
        return null;
    }

    return data?.id || null;
}

/** Get feedback stats for admin */
export async function getFeedbackStats(): Promise<{
    avgRating: number;
    totalCount: number;
    ratingDistribution: Record<number, number>;
    recentNegative: any[];
}> {
    const supabase = createSupabaseAdminClient();

    const [allFeedback, negativeFeedback] = await Promise.all([
        supabase.from('feedback').select('rating'),
        supabase.from('feedback').select('*').lte('rating', 2).order('created_at', { ascending: false }).limit(20),
    ]);

    const ratings = allFeedback.data || [];
    const totalCount = ratings.length;
    const avgRating = totalCount > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalCount : 0;

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of ratings) {
        if (r.rating >= 1 && r.rating <= 5) {
            ratingDistribution[r.rating]++;
        }
    }

    return {
        avgRating: Math.round(avgRating * 10) / 10,
        totalCount,
        ratingDistribution,
        recentNegative: negativeFeedback.data || [],
    };
}
