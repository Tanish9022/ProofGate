import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { getContent } from '@/server/services/content';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;
  const versionParam = request.nextUrl.searchParams.get('v');
  const targetVer = versionParam ? parseInt(versionParam, 10) : undefined;

  try {
    const detail = await getContent(ctx.workspaceId, id, targetVer);
    if (!detail) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Content piece not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json(detail);
  } catch (error) {
    console.error('GET /api/content/:id error:', error);
    return NextResponse.json(
      { error: { code: 'fetch_failed', message: 'Could not load content piece' } },
      { status: 500 }
    );
  }
}

