import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { submitForReview } from '@/server/services/clearance';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(request, 'creator');
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const json = await request.json();
    const versionId = json.versionId;
    if (!versionId || typeof versionId !== 'string') {
      return NextResponse.json(
        { error: { code: 'missing_version_id', message: 'versionId is required' } },
        { status: 400 }
      );
    }

    const result = await submitForReview(ctx.workspaceId, id, versionId, ctx.role);
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/content/:id/submit-for-review error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'submit_for_review_failed',
          message: error instanceof Error ? error.message : 'Could not submit for review',
        },
      },
      { status: 400 }
    );
  }
}

