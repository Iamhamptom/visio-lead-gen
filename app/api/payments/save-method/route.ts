import { NextRequest, NextResponse } from 'next/server';
import { updatePaymentMethod } from '@/lib/data-service'; // We need to create this
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

        const success = await updatePaymentMethod({
            token,
            brand: 'Card', // Yoco SDK doesn't spill this easily on tokenization alone without events
            last4: '****',
            expiry: 'Valid'
        });

        if (!success) {
            throw new Error('Failed to update database');
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
