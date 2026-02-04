import { NextResponse } from 'next/server';
import { getYocoPublicKey } from '@/lib/yoco';

export async function GET() {
    try {
        const publicKey = getYocoPublicKey();

        if (!publicKey) {
            return NextResponse.json({ error: 'Yoco Public Key not configured' }, { status: 500 });
        }

        return NextResponse.json({ publicKey });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
