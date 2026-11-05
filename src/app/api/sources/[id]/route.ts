import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { getSourceById } from '@/server/services/sources';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const detail = await getSourceById(ctx.workspaceId, id);
    if (!detail) {
      return NextResponse.json(
        { error: { code: 'source_not_found', message: 'Source not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json(detail);
  } catch (error) {
    console.error('GET /api/sources/:id error:', error);
    return NextResponse.json(
      { error: { code: 'source_fetch_failed', message: 'Could not fetch source details' } },
      { status: 500 }
    );
  }
}

