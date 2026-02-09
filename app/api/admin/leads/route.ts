import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // 1. Verify Authentication
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
        }

        // 2. Verify Admin Role
        if (user.app_metadata.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Fetch Lead Gen Intents
        // we look for messages where the assistant responded with "Agents deployed"
        // and then get the PREVIOUS message from the user in that session.
        // OR simpler: Fetch all messages from 'user' role that contain "lead" or "find" 
        // AND are followed by an "Agents deployed" response.

        // Let's try a broader search first: 
        // Get sessions where messages contain the specific agent response.

        const { data: sessions, error } = await supabaseAdmin
            .from('sessions')
            .select('*')
            .order('last_updated', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Filter and process in memory for now (easier than complex SQL joins on JSONB if messages are JSONB, 
        // but wait, messages are in a separate table? data-service said:
        // "messages: (messagesData || []).map..."
        // So messages ARE in a separate table.

        // Let's fetch messages directly then.
        const { data: messages, error: msgError } = await supabaseAdmin
            .from('messages')
            .select('*, session:sessions(user_id)')
            .eq('role', 'user')
            .or('content.ilike.%lead%,content.ilike.%find%') // Basic keyword filter for now
            .order('created_at', { ascending: false })
            .limit(50);

        if (msgError) throw msgError;

        // Enhance with user details
        const enhancedMessages = await Promise.all(messages.map(async (msg) => {
            const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(msg.session.user_id);
            return {
                ...msg,
                user_email: user?.email,
                user_name: user?.user_metadata?.full_name
            };
        }));

        return NextResponse.json({ leads: enhancedMessages });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
