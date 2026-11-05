import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { getAuditLogs } from '@/server/services/revalidate';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '200', 10);
    const logs = await getAuditLogs(ctx.workspaceId, limit);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('GET /api/audit error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'fetch_failed',
          message: error instanceof Error ? error.message : 'Failed to fetch audit log',
        },
      },
      { status: 500 }
    );
  }
}

