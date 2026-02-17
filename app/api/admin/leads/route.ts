import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/api-auth';
import { performCascadingSearch } from '@/lib/lead-pipeline';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const admin = await requireAdmin(req);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.error }, { status: admin.status });
        }

        // Read from lead_requests table (structured logging, replaces keyword matching)
        const { data: requests, error: reqError } = await supabaseAdmin
            .from('lead_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (reqError) {
            // Fallback to legacy keyword matching if lead_requests table doesn't exist yet
            const { data: messages, error: msgError } = await supabaseAdmin
                .from('messages')
                .select('*, session:sessions(user_id)')
                .eq('role', 'user')
                .or('content.ilike.%lead%,content.ilike.%find%')
                .order('created_at', { ascending: false })
                .limit(50);

            if (msgError) throw msgError;

            const enhancedMessages = await Promise.all((messages || []).map(async (msg) => {
                const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(msg.session.user_id);
                return {
                    ...msg,
                    user_email: user?.email,
                    user_name: user?.user_metadata?.full_name
                };
            }));

            return NextResponse.json({ leads: enhancedMessages });
        }

        // Enhance lead_requests with user details
        const enhancedRequests = await Promise.all(
            (requests || []).map(async (r) => {
                const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
                return {
                    id: r.id,
                    content: r.query,
                    query: r.query,
                    status: r.status,
                    results_count: r.results_count,
                    results: r.results,
                    target_count: r.target_count,
                    contact_types: r.contact_types,
                    markets: r.markets,
                    genre: r.genre,
                    session_id: r.session_id,
                    user_id: r.user_id,
                    created_at: r.created_at,
                    completed_at: r.completed_at,
                    user_email: user?.email,
                    user_name: user?.user_metadata?.full_name,
                };
            })
        );

        return NextResponse.json({ leads: enhancedRequests });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const admin = await requireAdmin(req);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.error }, { status: admin.status });
        }

        const { leadRequestId, action } = await req.json();

        if (!leadRequestId || !action) {
            return NextResponse.json({ error: 'Missing leadRequestId or action' }, { status: 400 });
        }

        switch (action) {
            case 'archive': {
                const { error } = await supabaseAdmin
                    .from('lead_requests')
                    .update({ status: 'archived' })
                    .eq('id', leadRequestId);
                if (error) throw error;
                return NextResponse.json({ success: true, status: 'archived' });
            }

            case 'process': {
                // Mark as admin_processing
                await supabaseAdmin
                    .from('lead_requests')
                    .update({
                        status: 'admin_processing',
                        processed_by: admin.user.id,
                    })
                    .eq('id', leadRequestId);

                // Fetch the lead request details
                const { data: request } = await supabaseAdmin
                    .from('lead_requests')
                    .select('*')
                    .eq('id', leadRequestId)
                    .single();

                if (!request) {
                    return NextResponse.json({ error: 'Lead request not found' }, { status: 404 });
                }

                // Run cascading search with the original request parameters
                const brief = {
                    contactTypes: request.contact_types?.length > 0
                        ? request.contact_types
                        : ['curators', 'journalists', 'bloggers', 'DJs', 'A&R'],
                    markets: request.markets?.length > 0 ? request.markets : ['ZA'],
                    genre: request.genre || '',
                    query: request.query,
                    targetCount: request.target_count || 100,
                    searchDepth: 'full' as const,
                };

                const result = await performCascadingSearch(brief);

                // Store results and mark complete
                await supabaseAdmin
                    .from('lead_requests')
                    .update({
                        status: 'completed',
                        results_count: result.contacts.length,
                        results: result.contacts,
                        completed_at: new Date().toISOString(),
                    })
                    .eq('id', leadRequestId);

                return NextResponse.json({
                    success: true,
                    status: 'completed',
                    resultsCount: result.contacts.length,
                });
            }

            case 'send': {
                // Fetch the lead request with results
                const { data: request } = await supabaseAdmin
                    .from('lead_requests')
                    .select('*')
                    .eq('id', leadRequestId)
                    .single();

                if (!request || !request.results || request.results.length === 0) {
                    return NextResponse.json({ error: 'No results to send' }, { status: 400 });
                }

                // Find or create a session for this user
                let sessionId = request.session_id;

                if (!sessionId) {
                    const newSessionId = crypto.randomUUID();
                    const { error: sessError } = await supabaseAdmin
                        .from('sessions')
                        .insert({
                            id: newSessionId,
                            user_id: request.user_id,
                            title: `Lead Results: ${request.query.slice(0, 40)}`,
                            updated_at: new Date().toISOString(),
                        });
                    if (sessError) throw sessError;
                    sessionId = newSessionId;
                }

                // Map results to the Lead format expected by the frontend
                const leads = request.results.map((c: any, i: number) => ({
                    id: `lead-admin-${i}`,
                    name: c.name || 'Unknown',
                    title: c.title || '',
                    company: c.company || '',
                    email: c.email || '',
                    matchScore: 0,
                    socials: {
                        instagram: c.instagram,
                        tiktok: c.tiktok,
                        twitter: c.twitter,
                        linkedin: c.linkedin,
                    },
                    source: c.source || 'Admin Pipeline',
                    followers: c.followers || '',
                    country: c.country || '',
                    url: c.url || '',
                    snippet: c.snippet || '',
                }));

                // Insert a message with the leads into the user's session
                const messageId = crypto.randomUUID();
                const { error: msgError } = await supabaseAdmin
                    .from('messages')
                    .insert({
                        id: messageId,
                        session_id: sessionId,
                        role: 'model',
                        content: `## Your Leads Are Ready!\n\nFound **${leads.length}** contacts for: "${request.query}"`,
                        leads,
                        created_at: new Date().toISOString(),
                    });

                if (msgError) throw msgError;

                // Update the session timestamp so it surfaces in the user's sidebar
                await supabaseAdmin
                    .from('sessions')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', sessionId);

                return NextResponse.json({
                    success: true,
                    sessionId,
                    messageId,
                });
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Admin leads PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
