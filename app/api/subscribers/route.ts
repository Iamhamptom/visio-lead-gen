import { NextRequest, NextResponse } from 'next/server';
import {
    getSubscribers,
    getSubscriberByEmail,
    createSubscriber,
    upsertSubscriberByEmail
} from '@/lib/database';
import { requireAdmin } from '@/lib/api-auth';

// GET /api/subscribers - List all subscribers
export async function GET(request: NextRequest) {
    try {
        const admin = await requireAdmin(request);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.error }, { status: admin.status });
        }

        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (email) {
            const subscriber = await getSubscriberByEmail(email);
            if (!subscriber) {
                return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
            }
            return NextResponse.json(subscriber);
        }

        const subscribers = await getSubscribers();
        return NextResponse.json({
            subscribers,
            total: subscribers.length
        });
    } catch (error: any) {
        console.error('Get subscribers error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch subscribers' },
            { status: 500 }
        );
    }
}

// POST /api/subscribers - Create or update subscriber
export async function POST(request: NextRequest) {
    try {
        const admin = await requireAdmin(request);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.error }, { status: admin.status });
        }

        const body = await request.json();
        const { email, name, tier, status = 'pending' } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const subscriber = await upsertSubscriberByEmail(email, {
            email,
            name,
            tier: tier || 'artist',
            status
        });

        return NextResponse.json({
            success: true,
            subscriber
        });
    } catch (error: any) {
        console.error('Create subscriber error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create subscriber' },
            { status: 500 }
        );
    }
}
