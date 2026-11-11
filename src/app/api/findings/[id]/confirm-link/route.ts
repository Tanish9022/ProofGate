import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { confirmProbableLink } from '@/server/services/content';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(request, 'reviewer');
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    await confirmProbableLink(ctx.workspaceId, id, ctx.role);
    return NextResponse.json({ success: true, link_status: 'confirmed' });
  } catch (error) {
    console.error('POST /api/findings/:id/confirm-link error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'confirm_failed',
          message: error instanceof Error ? error.message : 'Could not confirm link',
        },
      },
      { status: 500 }
    );
  }
}
