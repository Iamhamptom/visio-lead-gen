import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
    try {
        const auth = await requireUser(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
        if (!auth.accessToken) {
            return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
        }

        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Token required' }, { status: 400 });
        }

        // TODO: In a real world, we would "Charge" the token $1 or use a "Verify" endpoint 
        // to get the card metadata (Last4, Brand) from Yoco. 
        // Yoco Checkouts API doesn't return this metadata easily without a charge.
        // For this implementation, we will assume validity and store the token.
        // We'll mock the card details for UI feedback or rely on what the frontend might have passed (none).

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !anonKey) {
            return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, anonKey, {
            global: {
                headers: { Authorization: `Bearer ${auth.accessToken}` }
            },
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        const { error } = await supabase
            .from('profiles')
            .update({
                payment_token: token,
                card_brand: 'Card',
                card_last4: '****',
                card_expiry: 'Valid'
            })
            .eq('id', auth.user.id);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Save Payment Method Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to save payment method' },
            { status: 500 }
        );
    }
}
