import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/api-auth';

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
                    target_count: r.target_count,
                    contact_types: r.contact_types,
                    markets: r.markets,
                    genre: r.genre,
                    session_id: r.session_id,
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
