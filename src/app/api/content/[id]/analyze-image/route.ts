import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestContext } from '@/server/apiHelper';
import { analyseImage, saveImageFindings, getImageFindings } from '@/server/services/imageChecker';
import { db } from '@/server/db/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const analyzeSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(['image/png', 'image/jpeg']),
  contentVersionId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: contentId } = await context.params;
  void contentId;

  const ctx = await getRequestContext(req);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json();
  const parsed = analyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { imageBase64, mimeType, contentVersionId } = parsed.data;

  // Verify content version belongs to this workspace
  const verCheck = await db<{ id: string }>(
    `SELECT id FROM content_versions WHERE id = $1 AND workspace_id = $2`,
    [contentVersionId, ctx.workspaceId]
  );
  if (!verCheck.length) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  // Validate base64 size (~4 MB limit)
  if (imageBase64.length > 5_600_000) {
    return NextResponse.json({ error: 'Image too large (max ~4 MB)' }, { status: 400 });
  }

  // Fetch brand palette from workspace sources
  const paletteRows = await db<{ value: Record<string, unknown> }>(
    `SELECT sv.value FROM source_versions sv
     JOIN sources s ON s.id = sv.source_id
     WHERE s.workspace_id = $1 AND s.key = 'brand_palette' AND sv.status = 'current'
     LIMIT 1`,
    [ctx.workspaceId]
  );
  const contrastRows = await db<{ value: Record<string, unknown> }>(
    `SELECT sv.value FROM source_versions sv
     JOIN sources s ON s.id = sv.source_id
     WHERE s.workspace_id = $1 AND s.key = 'contrast_threshold' AND sv.status = 'current'
     LIMIT 1`,
    [ctx.workspaceId]
  );

  const approvedHex: string[] =
    (paletteRows[0]?.value?.approved_hex as string[]) ?? ['#1a56db', '#ffffff', '#111928'];
  const tolerance: number = (paletteRows[0]?.value?.tolerance as number) ?? 30;
  const minContrastRatio: number = (contrastRows[0]?.value?.min_ratio as number) ?? 4.5;

  try {
    const findings = await analyseImage(
      ctx.workspaceId,
      contentVersionId,
      imageBase64,
      mimeType,
      approvedHex,
      tolerance,
      minContrastRatio
    );
    await saveImageFindings(ctx.workspaceId, contentVersionId, findings);
    return NextResponse.json({ findings, count: findings.length });
  } catch (error) {
    console.error('Image analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: contentId } = await context.params;
  void contentId;

  const ctx = await getRequestContext(req);
  if (ctx instanceof NextResponse) return ctx;

  const versionId = req.nextUrl.searchParams.get('versionId');
  if (!versionId) {
    return NextResponse.json({ error: 'versionId required' }, { status: 400 });
  }

  const findings = await getImageFindings(ctx.workspaceId, versionId);
  return NextResponse.json({ findings });
}

