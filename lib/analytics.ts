/**
 * Custom event tracking for Visio Lead Gen
 * 
 * Tracks key user actions via Vercel Analytics custom events.
 * Usage: import { trackEvent } from '@/lib/analytics'; trackEvent('lead_saved', { source: 'chat' });
 */

import { track } from '@vercel/analytics';

// ─── Event Names ───────────────────────────────────────
export type AnalyticsEvent =
    | 'sign_up'
    | 'sign_in'
    | 'tutorial_started'
    | 'tutorial_completed'
    | 'tutorial_skipped'
    | 'profile_created'
    | 'profile_updated'
    | 'chat_started'
    | 'message_sent'
    | 'lead_saved'
    | 'lead_viewed'
    | 'plan_upgraded'
    | 'plan_viewed'
    | 'search_performed'
    | 'help_viewed'
    | 'page_navigation';

// ─── Track Function ────────────────────────────────────
export function trackEvent(
    event: AnalyticsEvent,
    properties?: Record<string, string | number | boolean>
) {
    try {
        track(event, properties);
    } catch (e) {
        // Silently fail in dev or if analytics is blocked
        if (process.env.NODE_ENV === 'development') {
            console.log(`[Analytics] ${event}`, properties);
        }
    }
}
