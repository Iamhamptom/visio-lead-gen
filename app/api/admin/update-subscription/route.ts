import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const admin = await requireAdmin(req);
        if (!admin.ok) {
            return NextResponse.json({ error: admin.error }, { status: admin.status });
        }

        // Parse Body
        const { userId, tier, status } = await req.json();

        if (typeof userId !== 'string' || userId.length < 10) {
            return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
        }
        if (typeof tier !== 'string' || !tier.trim()) {
            return NextResponse.json({ error: 'Missing userId or tier' }, { status: 400 });
        }

        const allowedTiers = new Set(['artist', 'starter', 'artiste', 'starter_label', 'label', 'agency', 'enterprise']);
        if (!allowedTiers.has(tier)) {
            return NextResponse.json({ error: `Invalid tier: ${tier}` }, { status: 400 });
        }

        const allowedStatuses = new Set(['active', 'trialing', 'past_due', 'canceled']);
        if (status && (typeof status !== 'string' || !allowedStatuses.has(status))) {
            return NextResponse.json({ error: `Invalid status: ${String(status)}` }, { status: 400 });
        }

        // 4. Update Profile
        const updates: any = {
            subscription_tier: tier,
            subscription_status: status || 'active',
            updated_at: new Date().toISOString()
        };

        // If activating, extend period
        if (status === 'active' || !status) {
            updates.subscription_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (updateError) {
            console.error('Update subscription error:', updateError);
            return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
        }

        return NextResponse.json({ success: true, updates });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
