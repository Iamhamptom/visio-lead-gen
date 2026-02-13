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

        // 3. Fetch Lead Gen Intents
        // we look for messages where the assistant responded with "Agents deployed"
        // and then get the PREVIOUS message from the user in that session.
        // OR simpler: Fetch all messages from 'user' role that contain "lead" or "find" 
        // AND are followed by an "Agents deployed" response.

        // Let's try a broader search first: 
        // Get sessions where messages contain the specific agent response.

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
