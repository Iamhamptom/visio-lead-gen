import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * OAuth callback handler for Supabase Auth.
 * Handles the redirect from GitHub and other OAuth providers.
 */
export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') ?? '/';

    if (code) {
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Redirect to the dashboard or next page
            return NextResponse.redirect(new URL(next, request.url));
        }
    }

    // If there's an error, redirect to auth page with error
    return NextResponse.redirect(new URL('/auth?error=callback_error', request.url));
}
