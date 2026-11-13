import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { getUnclearRules } from '@/server/services/insights';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const rules = await getUnclearRules(ctx.workspaceId);
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('GET /api/insights/unclear-rules error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load unclear rules' },
      { status: 500 }
    );
  }
}

