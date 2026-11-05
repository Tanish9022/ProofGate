import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { getRevalidationData } from '@/server/services/revalidate';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const data = await getRevalidationData(ctx.workspaceId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/revalidation error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'fetch_failed',
          message: error instanceof Error ? error.message : 'Failed to fetch revalidation queue',
        },
      },
      { status: 500 }
    );
  }
}

