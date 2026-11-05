import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { analyzeContentVersion } from '@/server/services/content';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s max execution duration on Vercel

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(request, 'creator');
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const json = await request.json();
    const versionId = json.versionId;
    if (!versionId || typeof versionId !== 'string') {
      return NextResponse.json(
        { error: { code: 'missing_version_id', message: 'versionId is required for analysis' } },
        { status: 400 }
      );
    }

    const summary = await analyzeContentVersion(ctx.workspaceId, id, versionId, ctx.role);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('POST /api/content/:id/analyze error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'analysis_failed',
          message: error instanceof Error ? error.message : 'Analysis failed',
        },
      },
      { status: 500 }
    );
  }
}

