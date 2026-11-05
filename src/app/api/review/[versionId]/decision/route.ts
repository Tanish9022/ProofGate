import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { decideReview } from '@/server/services/clearance';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().max(1000).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ versionId: string }> }
) {
  const ctx = await getRequestContext(request, 'reviewer');
  if (ctx instanceof NextResponse) return ctx;

  const { versionId } = await context.params;

  try {
    const json = await request.json();
    const parsed = decisionSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'invalid_input',
            message: parsed.error.issues.map(i => i.message).join(', '),
          },
        },
        { status: 400 }
      );
    }

    const result = await decideReview(
      ctx.workspaceId,
      versionId,
      parsed.data.decision,
      parsed.data.comment || '',
      ctx.role
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/review/:versionId/decision error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'decision_failed',
          message: error instanceof Error ? error.message : 'Could not record decision',
        },
      },
      { status: 400 }
    );
  }
}

