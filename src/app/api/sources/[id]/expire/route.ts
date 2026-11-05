import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { expireSource } from '@/server/services/sources';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(request, 'admin');
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const result = await expireSource(ctx.workspaceId, id, ctx.role);
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/sources/:id/expire error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'expire_failed',
          message: error instanceof Error ? error.message : 'Could not expire source',
        },
      },
      { status: 500 }
    );
  }
}

