import { NextResponse } from 'next/server';
import { getYocoPublicKey } from '@/lib/yoco';
import { logError } from '@/lib/error-logger';

export async function GET() {
    try {
        const publicKey = getYocoPublicKey();

        if (!publicKey) {
            return NextResponse.json({ error: 'Yoco Public Key not configured' }, { status: 500 });
        }

        return NextResponse.json({ publicKey });
    } catch (error: any) {
        logError(error, 'payments:setup');
        return NextResponse.json({ error: 'Failed to fetch payment config' }, { status: 500 });
    }
}
