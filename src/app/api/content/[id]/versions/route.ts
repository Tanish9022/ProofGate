import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { createContentVersion } from '@/server/services/content';

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
    const text = json.text;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: { code: 'missing_text', message: 'Updated version text is required' } },
        { status: 400 }
      );
    }

    const result = await createContentVersion(ctx.workspaceId, id, text.trim(), ctx.role);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/content/:id/versions error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'version_failed',
          message: error instanceof Error ? error.message : 'Could not create new version',
        },
      },
      { status: 500 }
    );
  }
}

