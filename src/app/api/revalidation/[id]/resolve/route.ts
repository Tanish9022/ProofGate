import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { resolveRevalidationItem } from '@/server/services/revalidate';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const resolveSchema = z.object({
  action: z.enum(['reapprove', 'send_back']),
  comment: z.string().max(1000).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Only reviewers or admin can resolve revalidation
  const ctx = await getRequestContext(request, 'reviewer');
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const json = await request.json();
    const parsed = resolveSchema.safeParse(json);
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

    const result = await resolveRevalidationItem(
      ctx.workspaceId,
      id,
      parsed.data.action,
      parsed.data.comment || '',
      ctx.role
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/revalidation/:id/resolve error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'resolution_failed',
          message: error instanceof Error ? error.message : 'Could not resolve revalidation item',
        },
      },
      { status: 400 }
    );
  }
}

