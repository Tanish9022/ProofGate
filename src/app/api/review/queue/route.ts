import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { getReviewQueue } from '@/server/services/clearance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const queue = await getReviewQueue(ctx.workspaceId);
    return NextResponse.json(queue);
  } catch (error) {
    console.error('GET /api/review/queue error:', error);
    return NextResponse.json(
      { error: { code: 'fetch_failed', message: 'Could not load review queue' } },
      { status: 500 }
    );
  }
}

