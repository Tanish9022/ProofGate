import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { getEvaluationRuns } from '@/server/eval/runner';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const runs = await getEvaluationRuns(ctx.workspaceId);
    return NextResponse.json(runs);
  } catch (error) {
    console.error('GET /api/evaluation/runs error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'fetch_failed',
          message: error instanceof Error ? error.message : 'Could not fetch evaluation runs',
        },
      },
      { status: 500 }
    );
  }
}
