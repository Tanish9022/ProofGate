import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { rejectProbableLink } from '@/server/services/content';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const rejectSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(request, 'reviewer');
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    let reason: string | undefined;
    try {
      const body = await request.json();
      const parsed = rejectSchema.safeParse(body);
      if (parsed.success) {
        reason = parsed.data.reason;
      }
    } catch {
      // Body is optional
    }

    await rejectProbableLink(ctx.workspaceId, id, reason, ctx.role);
    return NextResponse.json({ success: true, link_status: null });
  } catch (error) {
    console.error('POST /api/findings/:id/reject-link error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'reject_failed',
          message: error instanceof Error ? error.message : 'Could not reject link',
        },
      },
      { status: 500 }
    );
  }
}
