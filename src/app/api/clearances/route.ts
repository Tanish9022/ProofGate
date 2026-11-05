import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { getClearances } from '@/server/services/clearance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const list = await getClearances(ctx.workspaceId);
    return NextResponse.json(list);
  } catch (error) {
    console.error('GET /api/clearances error:', error);
    return NextResponse.json(
      { error: { code: 'fetch_failed', message: 'Could not load clearances list' } },
      { status: 500 }
    );
  }
}

