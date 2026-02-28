import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { createSupportTicket, getUserTickets, getTicketMessages, addTicketMessage } from '@/lib/support';

export const dynamic = 'force-dynamic';

/**
 * Support Tickets API
 * GET  — List user's tickets or get messages for a specific ticket
 * POST — Create a new ticket or add a message
 */

export async function GET(request: NextRequest) {
    const auth = await requireUser(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ticketId = request.nextUrl.searchParams.get('ticket_id');

    if (ticketId) {
        const messages = await getTicketMessages(ticketId);
        return NextResponse.json({ messages });
    }

    const tickets = await getUserTickets(auth.user.id);
    return NextResponse.json({ tickets });
}

export async function POST(request: NextRequest) {
    const auth = await requireUser(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'add_message') {
            const success = await addTicketMessage(
                body.ticketId,
                'user',
                body.content,
                auth.user.id
            );
            return NextResponse.json({ success });
        }

        // Default: create new ticket
        const result = await createSupportTicket({
            userId: auth.user.id,
            subject: body.subject,
            description: body.description,
            category: body.category,
            priority: body.priority,
            sessionId: body.sessionId,
            pageUrl: body.pageUrl,
            browserInfo: body.browserInfo,
        });

        if (!result) {
            return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
