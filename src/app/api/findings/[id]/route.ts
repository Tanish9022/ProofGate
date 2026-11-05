import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { updateFinding } from '@/server/services/content';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const patchFindingSchema = z.object({
  action: z.enum(['accepted', 'edited', 'dismissed']),
  reason: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(request, 'creator');
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const json = await request.json();
    const parsed = patchFindingSchema.safeParse(json);
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

    await updateFinding(ctx.workspaceId, id, parsed.data.action, parsed.data.reason, ctx.role);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/findings/:id error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'update_failed',
          message: error instanceof Error ? error.message : 'Could not update finding',
        },
      },
      { status: 500 }
    );
  }
}

