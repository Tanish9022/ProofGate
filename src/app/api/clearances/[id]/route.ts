import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { getClearanceById } from '@/server/services/clearance';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const clearance = await getClearanceById(ctx.workspaceId, id);
    if (!clearance) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Clearance record not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json(clearance);
  } catch (error) {
    console.error('GET /api/clearances/:id error:', error);
    return NextResponse.json(
      { error: { code: 'fetch_failed', message: 'Could not load clearance record' } },
      { status: 500 }
    );
  }
}

