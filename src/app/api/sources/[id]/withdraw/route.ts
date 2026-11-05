import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { withdrawSource } from '@/server/services/sources';
import { withdrawSchema } from '@/server/validators/sources';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(request, 'admin');
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const json = await request.json();
    const parsed = withdrawSchema.safeParse(json);
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

    const result = await withdrawSource(ctx.workspaceId, id, parsed.data.reason, ctx.role);
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/sources/:id/withdraw error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'withdraw_failed',
          message: error instanceof Error ? error.message : 'Could not withdraw source',
        },
      },
      { status: 500 }
    );
  }
}

