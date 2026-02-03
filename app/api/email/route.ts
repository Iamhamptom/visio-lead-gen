import { NextRequest, NextResponse } from 'next/server';
import { generateWelcomeEmail, generateInvoiceEmail } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { to, type, data } = body;

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.warn('RESEND_API_KEY not configured. Email skipped:', type);
            // Return success to not block UI flows, but log warning
            return NextResponse.json({ success: true, skipped: true });
        }

        let subject = 'Notification from Visio AI';
        let html = '';

        if (type === 'welcome') {
            subject = 'Welcome to Visio AI!';
            html = generateWelcomeEmail(data.name || 'Artist');
        } else if (type === 'invoice') {
            subject = `Receipt for ${data.plan}`;
            html = generateInvoiceEmail(data.name || 'Subscriber', data.plan, data.amount);
        } else {
            return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
        }

        // Send via Resend/fetch
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: 'Visio AI <onboarding@resend.dev>', // Use verified sender or default test
                to: [to],
                subject: subject,
                html: html
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Resend API Error:', error);
            // Don't fail the request to client, just log
            return NextResponse.json({ success: false, error: 'Failed to send' }, { status: 200 }); // Status 200 to prevent client errors
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Email Route Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
