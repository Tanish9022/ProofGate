import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { supersedeSource } from '@/server/services/sources';
import { addVersionSchema } from '@/server/validators/sources';

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
    const parsed = addVersionSchema.safeParse(json);
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

    const result = await supersedeSource(ctx.workspaceId, id, parsed.data, ctx.role);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/sources/:id/versions error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'supersede_failed',
          message: error instanceof Error ? error.message : 'Could not add version',
        },
      },
      { status: 500 }
    );
  }
}

