import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { getImpactPreview } from '@/server/services/sources';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(request, 'admin');
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const affected = await getImpactPreview(ctx.workspaceId, id);
    return NextResponse.json({ affected });
  } catch (error) {
    console.error('GET /api/sources/:id/impact error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'impact_failed',
          message: error instanceof Error ? error.message : 'Could not fetch impact preview',
        },
      },
      { status: 500 }
    );
  }
}

