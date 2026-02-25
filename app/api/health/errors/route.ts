import { NextRequest, NextResponse } from 'next/server';
import { getRecentErrors } from '@/lib/error-logger';
import { requireAdmin } from '@/lib/api-auth';

/**
 * GET /api/health/errors — returns recent server-side errors.
 * Admin-only so error details don't leak to random visitors.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  }

  const limit = Math.min(
    Number(request.nextUrl.searchParams.get('limit') ?? 50),
    200
  );

  return NextResponse.json({
    errors: getRecentErrors(limit),
    count: getRecentErrors(200).length,
    serverTime: new Date().toISOString(),
  });
}
