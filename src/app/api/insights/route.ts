import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { getInsightsMetrics } from '@/server/services/insights';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const metrics = await getInsightsMetrics(ctx.workspaceId);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('GET /api/insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load insights' },
      { status: 500 }
    );
  }
}

