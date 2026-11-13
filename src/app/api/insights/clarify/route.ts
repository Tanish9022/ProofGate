import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestContext } from '@/server/apiHelper';
import { draftClarification } from '@/server/services/insights';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const clarifySchema = z.object({
  sourceVersionId: z.string().uuid(),
  currentRuleText: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const ctx = await getRequestContext(req, 'admin');
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json();
  const parsed = clarifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const result = await draftClarification(
      ctx.workspaceId,
      parsed.data.sourceVersionId,
      parsed.data.currentRuleText
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/insights/clarify error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Clarification failed' },
      { status: 500 }
    );
  }
}

