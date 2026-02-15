import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'public', 'data', 'db_ZA.json');
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json([], { status: 200 });
    }
}
