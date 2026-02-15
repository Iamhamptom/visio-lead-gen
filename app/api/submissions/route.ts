import { NextResponse } from 'next/server';
import { getYocoSecretKey } from '@/lib/yoco';

const YOCO_API_BASE = 'https://payments.yoco.com/api';
const SUBMISSION_FEE_CENTS = 18000; // R180 (~$10 USD)

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { artistName, email, genre, songLink, epkLink, message } = body;

        // Validate required fields
        if (!artistName?.trim()) {
            return NextResponse.json({ error: 'Artist name is required' }, { status: 400 });
        }
        if (!email?.trim() || !email.includes('@')) {
            return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
        }
        if (!genre?.trim()) {
            return NextResponse.json({ error: 'Genre is required' }, { status: 400 });
        }
        if (!songLink?.trim()) {
            return NextResponse.json({ error: 'Song link is required' }, { status: 400 });
        }

        // Store submission data in metadata for retrieval after payment
        const submissionData = {
            artistName: String(artistName).slice(0, 200),
            email: String(email).slice(0, 200),
            genre: String(genre).slice(0, 100),
            songLink: String(songLink).slice(0, 500),
            epkLink: epkLink ? String(epkLink).slice(0, 500) : '',
            message: message ? String(message).slice(0, 1000) : '',
            submittedAt: new Date().toISOString(),
        };

        // Try Yoco checkout
        const secretKey = getYocoSecretKey();
        if (secretKey) {
            const origin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';

            const checkoutRes = await fetch(`${YOCO_API_BASE}/checkouts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${secretKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: SUBMISSION_FEE_CENTS,
                    currency: 'ZAR',
                    successUrl: `${origin}/payment-success?type=submission&email=${encodeURIComponent(email)}`,
                    cancelUrl: `${origin}/marketplace`,
                    failureUrl: `${origin}/marketplace`,
                    metadata: {
                        type: 'music_submission',
                        artistName: submissionData.artistName,
                        email: submissionData.email,
                        genre: submissionData.genre,
                        songLink: submissionData.songLink,
                        epkLink: submissionData.epkLink,
                        message: submissionData.message.slice(0, 200),
                    }
                })
            });

            if (checkoutRes.ok) {
                const checkout = await checkoutRes.json();
                // Also save to local file as backup (admin can see all submissions)
                await saveSubmissionToFile(submissionData, checkout.id);
                return NextResponse.json({
                    success: true,
                    checkoutUrl: checkout.redirectUrl,
                    checkoutId: checkout.id,
                });
            }

            // If Yoco fails, still save the submission
            console.error('Yoco checkout failed, saving submission without payment');
        }

        // Fallback: save submission without payment (for dev/testing or if Yoco is not configured)
        await saveSubmissionToFile(submissionData, null);

        return NextResponse.json({
            success: true,
            message: 'Submission received. Our team will reach out shortly.',
        });

    } catch (err: any) {
        console.error('Submission error:', err);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}

// GET: Admin endpoint to list all submissions
export async function GET(request: Request) {
    try {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'data', 'submissions.json');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json([]);
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return NextResponse.json(data);
    } catch {
        return NextResponse.json([]);
    }
}

async function saveSubmissionToFile(submission: Record<string, any>, checkoutId: string | null) {
    try {
        const fs = await import('fs');
        const path = await import('path');
        const dirPath = path.join(process.cwd(), 'data');
        const filePath = path.join(dirPath, 'submissions.json');

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        let submissions: any[] = [];
        if (fs.existsSync(filePath)) {
            submissions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }

        submissions.push({
            id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            ...submission,
            checkoutId,
            paymentStatus: checkoutId ? 'pending' : 'free',
            createdAt: new Date().toISOString(),
        });

        fs.writeFileSync(filePath, JSON.stringify(submissions, null, 2));
    } catch (e) {
        console.error('Failed to save submission to file:', e);
    }
}
